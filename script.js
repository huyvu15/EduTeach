// Global variables
let currentUser = null
let sidebarCollapsed = false

// API Client Class
class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:8000'
    this.token = localStorage.getItem('access_token')
  }

  async login(email, password) {
    const formData = new FormData()
    formData.append('username', email) // Backend expects 'username', not 'email'
    formData.append('password', password)

    const response = await fetch(`${this.baseURL}/token`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()
    this.token = data.access_token
    localStorage.setItem('access_token', this.token)
    return data
  }

  async getCurrentUser() {
    if (!this.token) {
      throw new Error('No access token')
    }

    const response = await fetch(`${this.baseURL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken()
        throw new Error('Authentication expired')
      }
      throw new Error('Failed to get user info')
    }

    return await response.json()
  }

  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken()
        window.location.href = 'index.html'
        return
      }
      const error = await response.json()
      throw new Error(error.detail || 'API call failed')
    }

    return await response.json()
  }

  // API helper methods
  async get(endpoint) {
    return this.apiCall(endpoint)
  }

  async post(endpoint, data) {
    return this.apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put(endpoint, data) {
    return this.apiCall(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint) {
    return this.apiCall(endpoint, {
      method: 'DELETE'
    })
  }

  // Statistics API
  async getStatistics() {
    return this.get('/statistics')
  }

  // Assignment APIs
  async getAssignments() {
    return this.get('/assignments')
  }

  async createAssignment(assignmentData) {
    return this.post('/assignments', assignmentData)
  }

  // Student APIs
  async getStudents() {
    return this.get('/students')
  }

  async createStudent(studentData) {
    return this.post('/students', studentData)
  }

  // Course APIs
  async getCourses() {
    return this.get('/courses')
  }

  async createCourse(courseData) {
    return this.post('/courses', courseData)
  }

  // Exam APIs
  async getExams() {
    return this.get('/exams')
  }

  async createExam(examData) {
    return this.post('/exams', examData)
  }

  // Webinar APIs
  async getWebinars() {
    return this.get('/webinars')
  }

  async createWebinar(webinarData) {
    return this.post('/webinars', webinarData)
  }

  // Library APIs
  async getLibraryDocuments(category = null) {
    let url = '/library'
    if (category) {
      url += `?category=${category}`
    }
    return this.get(url)
  }

  async uploadDocument(formData) {
    const response = await fetch(`${this.baseURL}/library/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Upload failed')
    }

    return await response.json()
  }

  // Forum APIs
  async getForumTopics(skip = 0, limit = 100, category = null) {
    let url = `/forum?skip=${skip}&limit=${limit}`
    if (category) {
      url += `&category=${category}`
    }
    return this.get(url)
  }

  async createForumTopic(topicData) {
    return this.post('/forum', topicData)
  }

  removeToken() {
    this.token = null
    localStorage.removeItem('access_token')
  }
}

// Initialize API client
const apiClient = new ApiClient()

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  const searchInputs = document.querySelectorAll(".search-box input")

  searchInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      handleSearch(e.target.value)
    })
  })
})

// Initialize Application
async function initializeApp() {
  setupEventListeners()
  await checkAuthStatus()
  await initializePage()
}

// Setup Event Listeners
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebarToggle")
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar)
  }

  // Mobile menu
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileSidebar)
  }

  // User menu
  const userMenuBtn = document.getElementById("userMenuBtn")
  if (userMenuBtn) {
    userMenuBtn.addEventListener("click", toggleUserMenu)
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    const userDropdown = document.getElementById("userDropdown")
    const userMenuBtn = document.getElementById("userMenuBtn")

    if (userDropdown && userMenuBtn && !userMenuBtn.contains(e.target)) {
      userDropdown.classList.remove("show")
    }
  })

  // Tab buttons
  const tabBtns = document.querySelectorAll(".tab-btn")
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      switchTab(this.dataset.tab)
    })
  })

  // Assignment form
  const createAssignmentForm = document.getElementById("createAssignmentForm")
  if (createAssignmentForm) {
    createAssignmentForm.addEventListener("submit", handleCreateAssignment)
  }

  // Student form
  const addStudentForm = document.getElementById("addStudentForm")
  if (addStudentForm) {
    addStudentForm.addEventListener("submit", handleAddStudent)
  }

  // Course form
  const createCourseForm = document.getElementById("createCourseForm")
  if (createCourseForm) {
    createCourseForm.addEventListener("submit", handleCreateCourse)
  }
}

// Check Authentication Status
async function checkAuthStatus() {
  const token = localStorage.getItem("access_token")
  const currentPage = window.location.pathname.split("/").pop()

  if (!token && currentPage !== "index.html" && currentPage !== "") {
    window.location.href = "index.html"
    return
  }

  if (token) {
    try {
      currentUser = await apiClient.getCurrentUser()
      updateUserInfo(currentUser)
    } catch (error) {
      console.error("Failed to get current user:", error)
      localStorage.removeItem("access_token")
      if (currentPage !== "index.html" && currentPage !== "") {
        window.location.href = "index.html"
      }
    }
  }
}

// Update user info in UI
function updateUserInfo(user) {
  const userNameElements = document.querySelectorAll(".user-name")
  const userRoleElements = document.querySelectorAll(".user-role")
  const userAvatarElements = document.querySelectorAll(".user-avatar, .user-avatar-small")

  userNameElements.forEach((element) => {
    element.textContent = user.full_name || user.email
  })

  userRoleElements.forEach((element) => {
    element.textContent = user.role === "teacher" ? "Giảng viên" : "Học viên"
  })

  if (user.avatar_url) {
    userAvatarElements.forEach((element) => {
      element.src = user.avatar_url
    })
  }
}

// Initialize Page
async function initializePage() {
  const currentPage = window.location.pathname.split("/").pop()

  // Add fade-in animation to main content
  const mainContent = document.querySelector(".main-content")
  if (mainContent) {
    mainContent.classList.add("fade-in")
  }

  // Initialize avatar management on all pages
  initializeAvatarManagement()

  // Initialize page-specific features
  switch (currentPage) {
    case "dashboard.html":
      await initializeDashboard()
      break
    case "assignments.html":
      await initializeAssignments()
      break
    case "students.html":
      await initializeStudents()
      break
    case "courses.html":
      await initializeCourses()
      break
    case "exams.html":
      await initializeExams()
      break
    case "webinars.html":
      await initializeWebinars()
      break
    case "library.html":
      await initializeLibrary()
      break
    case "forum.html":
      await initializeForum()
      break
    case "settings.html":
      initializeSettings()
      break
  }
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  if (!email || !password) {
    showNotification("Vui lòng nhập đầy đủ thông tin!", "error")
    return
  }

  const loginBtn = document.querySelector(".login-btn")
  const originalText = loginBtn.innerHTML
  loginBtn.innerHTML = '<div class="spinner"></div> Đang đăng nhập...'
  loginBtn.disabled = true

  try {
    await apiClient.login(email, password)
    currentUser = await apiClient.getCurrentUser()
    showNotification("Đăng nhập thành công!", "success")
    window.location.href = "dashboard.html"
  } catch (error) {
    console.error("Login failed:", error)
    showNotification("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!", "error")
  } finally {
    loginBtn.innerHTML = originalText
    loginBtn.disabled = false
  }
}

// Logout Handler
function logout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
    apiClient.removeToken()
    currentUser = null
    window.location.href = "index.html"
  }
}

// Toggle Password Visibility
function togglePassword() {
  const passwordInput = document.getElementById("password")
  const toggleBtn = document.querySelector(".toggle-password i")

  if (passwordInput.type === "password") {
    passwordInput.type = "text"
    toggleBtn.classList.remove("fa-eye")
    toggleBtn.classList.add("fa-eye-slash")
  } else {
    passwordInput.type = "password"
    toggleBtn.classList.remove("fa-eye-slash")
    toggleBtn.classList.add("fa-eye")
  }
}

// Sidebar Functions
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar")
  sidebar.classList.toggle("collapsed")
  sidebarCollapsed = !sidebarCollapsed
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar")
  sidebar.classList.toggle("show")
}

function toggleUserMenu() {
  const userDropdown = document.getElementById("userDropdown")
  userDropdown.classList.toggle("show")
}

// Tab Switching
function switchTab(tabName) {
  // Update tab buttons
  const tabBtns = document.querySelectorAll(".tab-btn")
  tabBtns.forEach((btn) => {
    btn.classList.remove("active")
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active")
    }
  })

  // Filter content based on tab
  filterContentByTab(tabName)
}

// Filter content by tab
function filterContentByTab(filter) {
  const currentPage = window.location.pathname.split("/").pop()

  switch (currentPage) {
    case "assignments.html":
      filterAssignments(filter)
      break
    case "exams.html":
      filterExams(filter)
      break
    default:
      break
  }
}

// Filter Assignments
function filterAssignments(filter) {
  const assignmentCards = document.querySelectorAll(".assignment-card")

  assignmentCards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge")
    let show = true

    if (filter !== "all") {
      const status = statusBadge.textContent.trim()
      switch (filter) {
        case "pending":
          show = status === "Chờ nộp bài" || status === "Chờ chấm điểm"
          break
        case "graded":
          show = status === "Đã chấm điểm" || status === "Đã hoàn thành"
          break
        case "overdue":
          show = status === "Quá hạn"
          break
        case "submitted":
          show = status === "Đã nộp bài"
          break
      }
    }

    card.style.display = show ? "block" : "none"
  })
}

// Filter Exams
function filterExams(filter) {
  const examCards = document.querySelectorAll(".exam-card")

  examCards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge")
    let show = true

    if (filter !== "all") {
      const status = statusBadge.textContent.trim()
      switch (filter) {
        case "upcoming":
          show = status === "Sắp diễn ra"
          break
        case "ongoing":
          show = status === "Đang diễn ra"
          break
        case "completed":
          show = status === "Đã hoàn thành"
          break
        case "cancelled":
          show = status === "Đã hủy"
          break
      }
    }

    card.style.display = show ? "block" : "none"
  })
}

// Modal Functions
function openCreateModal() {
  const modal = document.getElementById("createModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeCreateModal() {
  const modal = document.getElementById("createModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("createAssignmentForm")
    if (form) form.reset()
  }
}

function openAddStudentModal() {
  const modal = document.getElementById("addStudentModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeAddStudentModal() {
  const modal = document.getElementById("addStudentModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("addStudentForm")
    if (form) form.reset()
  }
}

// Modal Functions for Courses
function openCreateCourseModal() {
  const modal = document.getElementById("createCourseModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeCreateCourseModal() {
  const modal = document.getElementById("createCourseModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("createCourseForm")
    if (form) form.reset()
  }
}

// Form Handlers
async function handleCreateAssignment(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const assignmentData = {
    title: formData.get("assignmentTitle"),
    description: formData.get("assignmentDescription"),
    due_date: formData.get("dueDate"),
    max_score: Number.parseInt(formData.get("maxScore")),
    course_id: formData.get("courseId") || null,
  }

  try {
    await apiClient.createAssignment(assignmentData)
    showNotification("Bài tập đã được tạo thành công!", "success")
    closeCreateModal()
    await loadAssignments()
  } catch (error) {
    console.error("Failed to create assignment:", error)
    showNotification("Tạo bài tập thất bại!", "error")
  }
}

async function handleAddStudent(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const studentData = {
    full_name: formData.get("studentName"),
    email: formData.get("studentEmail"),
    phone: formData.get("studentPhone"),
    course_id: formData.get("studentClass"),
    notes: formData.get("studentNote"),
  }

  try {
    await apiClient.createStudent(studentData)
    showNotification("Học viên đã được thêm thành công!", "success")
    closeAddStudentModal()
    await loadStudents()
  } catch (error) {
    console.error("Failed to add student:", error)
    showNotification("Thêm học viên thất bại!", "error")
  }
}

// Form Handler for Course Creation
async function handleCreateCourse(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const courseData = {
    title: formData.get("courseTitle"),
    description: formData.get("courseDescription"),
    category: formData.get("courseCategory"),
    level: formData.get("courseLevel"),
    duration_hours: Number.parseInt(formData.get("courseDuration")),
    price: Number.parseFloat(formData.get("coursePrice")),
  }

  try {
    await apiClient.createCourse(courseData)
    showNotification("Khóa học đã được tạo thành công!", "success")
    closeCreateCourseModal()
    await loadCourses()
  } catch (error) {
    console.error("Failed to create course:", error)
    showNotification("Tạo khóa học thất bại!", "error")
  }
}

// Page Initialization Functions
async function initializeDashboard() {
  console.log("Dashboard initialized")

  try {
    const stats = await apiClient.getStatistics()
    updateDashboardStats(stats)

    // Animate stats cards
    const statCards = document.querySelectorAll(".stat-card")
    statCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add("fade-in")
      }, index * 100)
    })
  } catch (error) {
    console.error("Failed to load dashboard data:", error)
    showNotification("Không thể tải dữ liệu dashboard!", "error")
  }
}

function updateDashboardStats(stats) {
  // Update stat cards with real data
  const statCards = document.querySelectorAll(".stat-card")

  if (statCards.length >= 4) {
    statCards[0].querySelector("h3").textContent = stats.total_assignments || 0
    statCards[1].querySelector("h3").textContent = stats.total_students || 0
    statCards[2].querySelector("h3").textContent = stats.completed_assignments || 0
    statCards[3].querySelector("h3").textContent = (stats.average_score || 0).toFixed(1)
  }
}

async function initializeAssignments() {
  console.log("Assignments page initialized")
  switchTab("all")
  await loadAssignments()
}

async function loadAssignments() {
  try {
    const assignments = await apiClient.getAssignments()
    renderAssignments(assignments)
  } catch (error) {
    console.error("Failed to load assignments:", error)
    showNotification("Không thể tải danh sách bài tập!", "error")
  }
}

function renderAssignments(assignments) {
  const container = document.querySelector(".assignments-container")
  if (!container) return

  container.innerHTML = assignments
    .map(
      (assignment) => `
    <div class="assignment-card">
      <div class="assignment-header">
        <div class="assignment-info">
          <h3>${assignment.title}</h3>
          <p>${assignment.description || "Không có mô tả"}</p>
        </div>
        <div class="assignment-status">
          <span class="status-badge ${getAssignmentStatusClass(assignment.status)}">
            ${getAssignmentStatusText(assignment.status, assignment.due_date)}
          </span>
        </div>
      </div>
      
      <div class="assignment-meta">
        <div class="meta-item">
          <i class="fas fa-calendar"></i>
          <span>Hạn nộp: ${formatDate(assignment.due_date)}</span>
        </div>
        <div class="meta-item">
          <i class="fas fa-star"></i>
          <span>Điểm tối đa: ${assignment.max_score}</span>
        </div>
      </div>
      
      <div class="assignment-actions">
        <button class="btn btn-outline btn-sm" onclick="viewAssignment('${assignment.id}')">
          <i class="fas fa-eye"></i>
          Xem chi tiết
        </button>
        <button class="btn btn-primary btn-sm" onclick="gradeAssignment('${assignment.id}')">
          <i class="fas fa-check"></i>
          Chấm điểm
        </button>
      </div>
    </div>
  `,
    )
    .join("")
}

function getAssignmentStatusClass(status) {
  // Check if assignment is overdue
  const now = new Date()
  const dueDate = new Date(status.due_date || 0)
  
  switch (status) {
    case "pending":
      return dueDate < now ? "overdue" : "pending"
    case "completed":
      return "completed"
    case "graded":
      return "completed"
    case "submitted":
      return "submitted"
    default:
      return dueDate < now ? "overdue" : "pending"
  }
}

function getAssignmentStatusText(status, dueDate = null) {
  // Check if assignment is overdue
  const now = new Date()
  const due = new Date(dueDate || 0)
  
  switch (status) {
    case "pending":
      return due < now ? "Quá hạn" : "Chờ nộp bài"
    case "completed":
      return "Đã hoàn thành"
    case "graded":
      return "Đã chấm điểm"
    case "submitted":
      return "Đã nộp bài"
    default:
      return due < now ? "Quá hạn" : "Chờ nộp bài"
  }
}

async function initializeStudents() {
  console.log("Students page initialized")
  await loadStudents()
  animateProgressCircles()
}

async function loadStudents() {
  try {
    const students = await apiClient.getStudents()
    renderStudents(students)
  } catch (error) {
    console.error("Failed to load students:", error)
    showNotification("Không thể tải danh sách học viên!", "error")
  }
}

function renderStudents(students) {
  const container = document.querySelector(".students-grid")
  if (!container) return

  container.innerHTML = students
    .map(
      (student) => `
    <div class="student-card">
      <div class="student-avatar">
        <img src="${student.avatar_url || "https://via.placeholder.com/80"}" alt="Avatar">
        <div class="status-indicator ${student.is_active ? "active" : "inactive"}"></div>
      </div>
      <div class="student-info">
        <h3>${student.full_name}</h3>
        <p>${student.email}</p>
        <span class="student-id">ID: #${student.id.slice(-6)}</span>
      </div>
      <div class="student-progress">
        <div class="progress-circle">
          <svg viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="3"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4f46e5" stroke-width="3" stroke-dasharray="${student.progress || 0}, 100"/>
          </svg>
          <span>${student.progress || 0}%</span>
        </div>
        <p>Tiến độ học tập</p>
      </div>
      <div class="student-stats">
        <div class="stat">
          <span class="stat-value">${student.completed_assignments || 0}</span>
          <span class="stat-label">Bài tập</span>
        </div>
        <div class="stat">
          <span class="stat-value">${(student.average_score || 0).toFixed(1)}</span>
          <span class="stat-label">Điểm TB</span>
        </div>
      </div>
      <div class="student-actions">
        <button class="btn btn-outline btn-sm" onclick="viewStudent('${student.id}')">
          <i class="fas fa-eye"></i>
          Xem
        </button>
        <button class="btn btn-primary btn-sm" onclick="contactStudent('${student.id}')">
          <i class="fas fa-envelope"></i>
          Liên hệ
        </button>
      </div>
    </div>
  `,
    )
    .join("")
}

async function initializeCourses() {
  console.log("Courses page initialized")
  await loadCourses()
}

async function loadCourses() {
  try {
    const courses = await apiClient.getCourses()
    renderCourses(courses)
  } catch (error) {
    console.error("Failed to load courses:", error)
    showNotification("Không thể tải danh sách khóa học!", "error")
  }
}

function renderCourses(courses) {
  const container = document.querySelector(".courses-grid")
  if (!container) return

  container.innerHTML = courses
    .map(
      (course) => `
    <div class="course-card">
      <div class="course-image">
        <img src="${course.image_url || "https://via.placeholder.com/300x180"}" alt="Course">
        <div class="course-badge ${getCourseStatusClass(course.status)}">${getCourseStatusText(course.status)}</div>
      </div>
      <div class="course-content">
        <h3>${course.title}</h3>
        <p>${course.description || "Không có mô tả"}</p>
        <div class="course-meta">
          <div class="meta-item">
            <i class="fas fa-users"></i>
            <span>${course.enrolled_students || 0} học viên</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>${course.duration_hours || 0} giờ</span>
          </div>
        </div>
        <div class="course-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${course.progress || 0}%"></div>
          </div>
          <span class="progress-text">${course.progress || 0}% hoàn thành</span>
        </div>
        <div class="course-actions">
          <button class="btn btn-outline btn-sm" onclick="editCourse('${course.id}')">
            <i class="fas fa-edit"></i>
            Sửa
          </button>
          <button class="btn btn-primary btn-sm" onclick="viewCourse('${course.id}')">
            <i class="fas fa-eye"></i>
            Xem
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

function getCourseStatusClass(status) {
  switch (status) {
    case "active":
      return "active"
    case "draft":
      return "draft"
    case "completed":
      return "completed"
    case "archived":
      return "archived"
    default:
      return "draft"
  }
}

function getCourseStatusText(status) {
  switch (status) {
    case "active":
      return "Đang hoạt động"
    case "draft":
      return "Bản nháp"
    case "completed":
      return "Đã hoàn thành"
    case "archived":
      return "Đã lưu trữ"
    default:
      return "Bản nháp"
  }
}

async function initializeExams() {
  console.log("Exams page initialized")
  switchTab("all")
  await loadExams()
}

async function loadExams() {
  try {
    const exams = await apiClient.getExams()
    renderExams(exams)
  } catch (error) {
    console.error("Failed to load exams:", error)
    showNotification("Không thể tải danh sách kỳ thi!", "error")
  }
}

function renderExams(exams) {
  const container = document.querySelector(".exams-container")
  if (!container) return

  container.innerHTML = exams
    .map(
      (exam) => `
    <div class="exam-card">
      <div class="exam-header">
        <div class="exam-info">
          <h3>${exam.title}</h3>
          <p>${exam.description || "Không có mô tả"}</p>
        </div>
        <div class="exam-status">
          <span class="status-badge ${getExamStatusClass(exam.status, exam.exam_date)}">
            ${getExamStatusText(exam.status, exam.exam_date)}
          </span>
        </div>
      </div>
      
      <div class="exam-meta">
        <div class="meta-item">
          <i class="fas fa-calendar"></i>
          <span>${formatDateTime(exam.exam_date)}</span>
        </div>
        <div class="meta-item">
          <i class="fas fa-clock"></i>
          <span>${exam.duration_minutes} phút</span>
        </div>
        <div class="meta-item">
          <i class="fas fa-question-circle"></i>
          <span>${exam.total_questions || 0} câu hỏi</span>
        </div>
      </div>
      
      <div class="exam-actions">
        <button class="btn btn-outline btn-sm" onclick="editExam('${exam.id}')">
          <i class="fas fa-edit"></i>
          Chỉnh sửa
        </button>
        <button class="btn btn-primary btn-sm" onclick="viewExam('${exam.id}')">
          <i class="fas fa-eye"></i>
          Xem chi tiết
        </button>
      </div>
    </div>
  `,
    )
    .join("")
}

function getExamStatusClass(status, examDate) {
  const now = new Date()
  const examDateTime = new Date(examDate)
  
  switch (status) {
    case "upcoming":
      return examDateTime > now ? "upcoming" : "ongoing"
    case "ongoing":
      return "ongoing"
    case "completed":
      return "completed"
    case "cancelled":
      return "cancelled"
    default:
      return examDateTime > now ? "upcoming" : (examDateTime < now ? "completed" : "ongoing")
  }
}

function getExamStatusText(status, examDate) {
  const now = new Date()
  const examDateTime = new Date(examDate)
  
  switch (status) {
    case "upcoming":
      return examDateTime > now ? "Sắp diễn ra" : "Đang diễn ra"
    case "ongoing":
      return "Đang diễn ra"
    case "completed":
      return "Đã hoàn thành"
    case "cancelled":
      return "Đã hủy"
    default:
      return examDateTime > now ? "Sắp diễn ra" : (examDateTime < now ? "Đã hoàn thành" : "Đang diễn ra")
  }
}

async function initializeWebinars() {
  console.log("Webinars page initialized")
  await loadWebinars()
}

async function loadWebinars() {
  try {
    const webinars = await apiClient.getWebinars()
    renderWebinars(webinars)
  } catch (error) {
    console.error("Failed to load webinars:", error)
    showNotification("Không thể tải danh sách webinar!", "error")
  }
}

function renderWebinars(webinars) {
  const container = document.querySelector(".webinars-grid")
  if (!container) return

  container.innerHTML = webinars
    .map(
      (webinar) => `
    <div class="webinar-card ${getWebinarStatusClass(webinar.status, webinar.scheduled_date)}">
      <div class="webinar-thumbnail">
        <img src="${webinar.thumbnail_url || "https://via.placeholder.com/300x180"}" alt="Webinar">
        ${webinar.status === "live" ? '<div class="live-indicator"><i class="fas fa-circle"></i>LIVE</div>' : ""}
        <div class="webinar-duration">${webinar.duration_minutes} phút</div>
      </div>
      <div class="webinar-content">
        <h3>${webinar.title}</h3>
        <p>${webinar.description || "Không có mô tả"}</p>
        <div class="webinar-meta">
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>${formatDateTime(webinar.scheduled_date)}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-users"></i>
            <span>${webinar.registered_count || 0} đã đăng ký</span>
          </div>
        </div>
        <div class="webinar-actions">
          ${getWebinarActionButtons(webinar)}
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

function getWebinarStatusClass(status, scheduledDate) {
  const now = new Date()
  const webinarDateTime = new Date(scheduledDate)
  
  switch (status) {
    case "upcoming":
      return webinarDateTime > now ? "upcoming" : "live"
    case "live":
      return "live"
    case "completed":
      return "completed"
    case "cancelled":
      return "cancelled"
    default:
      return webinarDateTime > now ? "upcoming" : (webinarDateTime < now ? "completed" : "live")
  }
}

function getWebinarActionButtons(webinar) {
  const now = new Date()
  const webinarDateTime = new Date(webinar.scheduled_date)
  const status = getWebinarStatusClass(webinar.status, webinar.scheduled_date)
  
  switch (status) {
    case "live":
      return `
        <button class="btn btn-primary" onclick="joinWebinar('${webinar.id}')">
          <i class="fas fa-video"></i>
          Tham gia ngay
        </button>
        <button class="btn btn-outline" onclick="shareWebinar('${webinar.id}')">
          <i class="fas fa-share"></i>
          Chia sẻ
        </button>
      `
    case "upcoming":
      return `
        <button class="btn btn-primary" onclick="registerWebinar('${webinar.id}')">
          <i class="fas fa-calendar-plus"></i>
          Đăng ký
        </button>
        <button class="btn btn-outline" onclick="editWebinar('${webinar.id}')">
          <i class="fas fa-edit"></i>
          Chỉnh sửa
        </button>
      `
    case "completed":
      return `
        <button class="btn btn-primary" onclick="watchRecording('${webinar.id}')">
          <i class="fas fa-play"></i>
          Xem lại
        </button>
        <button class="btn btn-outline" onclick="downloadRecording('${webinar.id}')">
          <i class="fas fa-download"></i>
          Tải về
        </button>
      `
    case "cancelled":
      return `
        <button class="btn btn-outline" disabled>
          <i class="fas fa-ban"></i>
          Đã hủy
        </button>
      `
    default:
      return `
        <button class="btn btn-outline" onclick="editWebinar('${webinar.id}')">
          <i class="fas fa-edit"></i>
          Chỉnh sửa
        </button>
      `
  }
}

async function initializeLibrary() {
  console.log("Library page initialized")
  await loadLibraryDocuments()
  setupLibraryEventListeners()
}

async function loadLibraryDocuments(category = null) {
  try {
    const documents = await apiClient.getLibraryDocuments(0, 100, category)
    renderLibraryDocuments(documents)
  } catch (error) {
    console.error("Failed to load library documents:", error)
    showNotification("Không thể tải danh sách tài liệu!", "error")
  }
}

function renderLibraryDocuments(documents) {
  const container = document.querySelector(".library-grid")
  if (!container) return

  container.innerHTML = documents
    .map(
      (doc) => `
    <div class="document-card">
      <div class="document-preview">
        <i class="fas ${getDocumentIcon(doc.file_type)} file-icon ${getDocumentIconClass(doc.file_type)}"></i>
        <span class="file-type">${doc.file_type.toUpperCase()}</span>
        ${doc.file_type === "mp4" ? `<span class="video-duration">${doc.duration || "00:00"}</span>` : ""}
      </div>
      <div class="document-info">
        <h3>${doc.title}</h3>
        <p>${doc.description || "Không có mô tả"}</p>
        <div class="document-meta">
          <div class="meta-item">
            <i class="fas fa-user"></i>
            <span>${doc.author_name || "Không rõ"}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>${formatDate(doc.created_at)}</span>
          </div>
        </div>
        <div class="document-stats">
          <div class="stat-item">
            <i class="fas fa-eye"></i>
            <span>${doc.views || 0} lượt xem</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-download"></i>
            <span>${doc.downloads || 0} lượt tải</span>
          </div>
        </div>
        <div class="document-actions">
          <button class="btn btn-outline btn-sm" onclick="viewDocument('${doc.id}')">
            <i class="fas fa-eye"></i>
            Xem
          </button>
          <button class="btn btn-primary btn-sm" onclick="downloadDocument('${doc.id}')">
            <i class="fas fa-download"></i>
            Tải xuống
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

function getDocumentIcon(fileType) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return "fa-file-pdf"
    case "mp4":
    case "avi":
    case "mov":
      return "fa-play-circle"
    case "ppt":
    case "pptx":
      return "fa-file-powerpoint"
    case "zip":
    case "rar":
      return "fa-file-archive"
    case "doc":
    case "docx":
      return "fa-file-word"
    default:
      return "fa-file-alt"
  }
}

function getDocumentIconClass(fileType) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return ""
    case "mp4":
    case "avi":
    case "mov":
      return "video"
    case "ppt":
    case "pptx":
      return "presentation"
    case "zip":
    case "rar":
      return "code"
    default:
      return ""
  }
}

function setupLibraryEventListeners() {
  const categoryBtns = document.querySelectorAll(".category-btn")
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      categoryBtns.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")

      const category = this.dataset.category
      if (category === "all") {
        loadLibraryDocuments()
      } else {
        loadLibraryDocuments(category)
      }
    })
  })

  const uploadForm = document.getElementById("uploadForm")
  if (uploadForm) {
    uploadForm.addEventListener("submit", handleUploadDocument)
  }
}

async function handleUploadDocument(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const file = formData.get("file")

  if (!file) {
    showNotification("Vui lòng chọn file để tải lên!", "error")
    return
  }

  const documentData = {
    title: formData.get("documentTitle"),
    description: formData.get("documentDescription"),
    category: formData.get("documentCategory"),
    course_id: formData.get("documentCourse"),
    is_public: formData.get("isPublic") === "on",
  }

  try {
    await apiClient.uploadDocument(file, documentData)
    showNotification("Tài liệu đã được tải lên thành công!", "success")
    closeUploadModal()
    await loadLibraryDocuments()
  } catch (error) {
    console.error("Failed to upload document:", error)
    showNotification("Tải lên tài liệu thất bại!", "error")
  }
}

async function initializeForum() {
  console.log("Forum page initialized")
  await loadForumTopics()
  setupForumEventListeners()
}

async function loadForumTopics(category = null) {
  try {
    const topics = await apiClient.getForumTopics(0, 100, category)
    renderForumTopics(topics)
  } catch (error) {
    console.error("Failed to load forum topics:", error)
    showNotification("Không thể tải danh sách chủ đề!", "error")
  }
}

function renderForumTopics(topics) {
  const container = document.querySelector(".topics-list")
  if (!container) return

  container.innerHTML = topics
    .map(
      (topic) => `
    <div class="topic-item">
      <div class="topic-avatar">
        <img src="${topic.author_avatar || "https://via.placeholder.com/40"}" alt="Avatar">
      </div>
      <div class="topic-content">
        <h4>${topic.title}</h4>
        <div class="topic-meta">
          <span class="author">${topic.author_name}</span>
          <span>•</span>
          <span>${formatTimeAgo(topic.created_at)}</span>
          <span>•</span>
          <span class="category">${getCategoryText(topic.category)}</span>
          ${topic.is_pinned ? '<span class="pinned"><i class="fas fa-thumbtack"></i>Ghim</span>' : ""}
        </div>
        <div class="topic-excerpt">
          ${topic.content.substring(0, 150)}${topic.content.length > 150 ? "..." : ""}
        </div>
      </div>
      <div class="topic-stats">
        <div class="stat-item">
          <i class="fas fa-eye"></i>
          <span>${topic.views || 0}</span>
        </div>
        <div class="stat-item">
          <i class="fas fa-reply"></i>
          <span>${topic.replies || 0}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("")
}

function getCategoryText(category) {
  switch (category) {
    case "general":
      return "Thảo luận chung"
    case "qa":
      return "Hỏi đáp"
    case "projects":
      return "Dự án"
    case "announcements":
      return "Thông báo"
    default:
      return "Khác"
  }
}

function setupForumEventListeners() {
  const categoryCards = document.querySelectorAll(".category-card")
  categoryCards.forEach((card) => {
    card.addEventListener("click", function () {
      const category = this.dataset.category
      loadForumTopics(category)
    })
  })

  const createTopicForm = document.getElementById("createTopicForm")
  if (createTopicForm) {
    createTopicForm.addEventListener("submit", handleCreateTopic)
  }
}

async function handleCreateTopic(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const topicData = {
    title: formData.get("topicTitle"),
    content: formData.get("topicContent"),
    category: formData.get("topicCategory"),
    tags:
      formData
        .get("topicTags")
        ?.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag) || [],
    is_pinned: formData.get("isPinned") === "on",
  }

  try {
    await apiClient.createForumTopic(topicData)
    showNotification("Chủ đề đã được tạo thành công!", "success")
    closeCreateTopicModal()
    await loadForumTopics()
  } catch (error) {
    console.error("Failed to create topic:", error)
    showNotification("Tạo chủ đề thất bại!", "error")
  }
}

function initializeSettings() {
  console.log("Settings page initialized")

  // Add event listeners for settings tabs
  const settingsTabs = document.querySelectorAll(".settings-tab")
  settingsTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      switchSettingsTab(this.dataset.tab)
    })
  })

  // Add event listeners for color picker
  const colorOptions = document.querySelectorAll(".color-option")
  colorOptions.forEach((option) => {
    option.addEventListener("click", function () {
      colorOptions.forEach((opt) => opt.classList.remove("active"))
      this.classList.add("active")
    })
  })
}

// Utility Functions
function animateProgressCircles() {
  const progressCircles = document.querySelectorAll(".progress-circle")

  progressCircles.forEach((circle) => {
    const percentage = circle.querySelector("span").textContent
    const numericValue = Number.parseInt(percentage)
    const path = circle.querySelector("path:last-child")

    if (path) {
      setTimeout(() => {
        path.style.strokeDasharray = `${numericValue}, 100`
      }, 500)
    }
  })
}

function formatDate(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("vi-VN")
}

function formatDateTime(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleString("vi-VN")
}

function formatTimeAgo(dateString) {
  if (!dateString) return "N/A"

  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return "Vừa xong"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
  return `${Math.floor(diffInSeconds / 86400)} ngày trước`
}

// Search functionality
function handleSearch(query) {
  const currentPage = window.location.pathname.split("/").pop()

  switch (currentPage) {
    case "assignments.html":
      searchAssignments(query)
      break
    case "students.html":
      searchStudents(query)
      break
    case "courses.html":
      searchCourses(query)
      break
    case "library.html":
      searchDocuments(query)
      break
    case "forum.html":
      searchTopics(query)
      break
  }
}

function searchAssignments(query) {
  const assignmentCards = document.querySelectorAll(".assignment-card")
  filterCards(assignmentCards, query, [".assignment-info h3", ".assignment-info p"])
}

function searchStudents(query) {
  const studentCards = document.querySelectorAll(".student-card")
  filterCards(studentCards, query, [".student-info h3", ".student-info p"])
}

function searchCourses(query) {
  const courseCards = document.querySelectorAll(".course-card")
  filterCards(courseCards, query, [".course-content h3", ".course-content p"])
}

function searchDocuments(query) {
  const documentCards = document.querySelectorAll(".document-card")
  filterCards(documentCards, query, [".document-info h3", ".document-info p"])
}

function searchTopics(query) {
  const topicItems = document.querySelectorAll(".topic-item")
  filterCards(topicItems, query, [".topic-content h4", ".topic-excerpt"])
}

function filterCards(cards, query, selectors) {
  const searchQuery = query.toLowerCase()

  cards.forEach((card) => {
    let matches = false

    selectors.forEach((selector) => {
      const element = card.querySelector(selector)
      if (element && element.textContent.toLowerCase().includes(searchQuery)) {
        matches = true
      }
    })

    card.style.display = matches ? "block" : "none"
  })
}

// Notification functions
function showNotification(message, type = "success") {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 3000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `

  switch (type) {
    case "success":
      notification.style.backgroundColor = "#10b981"
      break
    case "error":
      notification.style.backgroundColor = "#ef4444"
      break
    case "warning":
      notification.style.backgroundColor = "#f59e0b"
      break
    default:
      notification.style.backgroundColor = "#3b82f6"
  }

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// Settings Tab Switching
function switchSettingsTab(tabName) {
  const tabBtns = document.querySelectorAll(".settings-tab")
  tabBtns.forEach((btn) => {
    btn.classList.remove("active")
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active")
    }
  })

  const panels = document.querySelectorAll(".settings-panel")
  panels.forEach((panel) => {
    panel.classList.remove("active")
    if (panel.id === `${tabName}-panel`) {
      panel.classList.add("active")
    }
  })
}

// Avatar Management Functions
function openAvatarModal() {
  const modal = document.getElementById("avatarModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeAvatarModal() {
  const modal = document.getElementById("avatarModal")
  if (modal) {
    modal.classList.remove("show")
  }
}

function switchAvatarTab(tabName) {
  const tabBtns = document.querySelectorAll(".avatar-tab")
  tabBtns.forEach((btn) => {
    btn.classList.remove("active")
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active")
    }
  })

  const tabContents = document.querySelectorAll(".avatar-tab-content")
  tabContents.forEach((content) => {
    content.classList.remove("active")
    if (content.id === `${tabName}-tab`) {
      content.classList.add("active")
    }
  })
}

async function saveAvatar() {
  const selectedAvatar = document.querySelector(".avatar-option.selected")
  const uploadedFile = document.getElementById("avatarInput").files[0]

  try {
    if (uploadedFile) {
      await apiClient.uploadAvatar(uploadedFile)
    } else if (selectedAvatar) {
      const avatarUrl = selectedAvatar.dataset.avatar
      // In a real implementation, you would send the selected avatar URL to the server
      updateUserAvatar(avatarUrl)
    } else {
      showNotification("Vui lòng chọn một avatar hoặc tải lên ảnh mới!", "warning")
      return
    }

    closeAvatarModal()
    showNotification("Avatar đã được cập nhật thành công!", "success")

    // Refresh user data
    currentUser = await apiClient.getCurrentUser()
    updateUserInfo(currentUser)
  } catch (error) {
    console.error("Failed to save avatar:", error)
    showNotification("Cập nhật avatar thất bại!", "error")
  }
}

function updateUserAvatar(avatarUrl) {
  const avatars = document.querySelectorAll(".user-avatar, .user-avatar-small")
  avatars.forEach((avatar) => {
    avatar.src = avatarUrl
  })

  localStorage.setItem("userAvatar", avatarUrl)
}

function initializeAvatarManagement() {
  const savedAvatar = localStorage.getItem("userAvatar")
  if (savedAvatar) {
    updateUserAvatar(savedAvatar)
  }

  const avatarTabs = document.querySelectorAll(".avatar-tab")
  avatarTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      switchAvatarTab(this.dataset.tab)
    })
  })

  const avatarOptions = document.querySelectorAll(".avatar-option")
  avatarOptions.forEach((option) => {
    option.addEventListener("click", function () {
      avatarOptions.forEach((opt) => opt.classList.remove("selected"))
      this.classList.add("selected")
    })
  })

  const avatarInput = document.getElementById("avatarInput")
  if (avatarInput) {
    avatarInput.addEventListener("change", handleAvatarUpload)
  }

  const uploadArea = document.querySelector(".avatar-upload-area")
  if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault()
      uploadArea.classList.add("dragover")
    })

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover")
    })

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault()
      uploadArea.classList.remove("dragover")
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleAvatarFile(files[0])
      }
    })
  }
}

function handleAvatarUpload(e) {
  const file = e.target.files[0]
  if (file) {
    handleAvatarFile(file)
  }
}

function handleAvatarFile(file) {
  if (!file.type.startsWith("image/")) {
    showNotification("Vui lòng chọn file ảnh!", "error")
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    showNotification("Kích thước file không được vượt quá 5MB!", "error")
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const preview = document.querySelector(".avatar-preview")
    const previewImage = document.querySelector(".avatar-preview-image")

    previewImage.src = e.target.result
    preview.style.display = "flex"
  }
  reader.readAsDataURL(file)
}

// Action handlers for UI interactions
async function viewAssignment(assignmentId) {
  try {
    const assignment = await apiClient.getAssignment(assignmentId)
    // Open assignment detail modal or navigate to detail page
    console.log("Viewing assignment:", assignment)
  } catch (error) {
    console.error("Failed to load assignment:", error)
    showNotification("Không thể tải chi tiết bài tập!", "error")
  }
}

async function gradeAssignment(assignmentId) {
  // Open grading interface
  console.log("Grading assignment:", assignmentId)
}

async function viewStudent(studentId) {
  try {
    const student = await apiClient.getStudent(studentId)
    console.log("Viewing student:", student)
  } catch (error) {
    console.error("Failed to load student:", error)
    showNotification("Không thể tải thông tin học viên!", "error")
  }
}

async function contactStudent(studentId) {
  console.log("Contacting student:", studentId)
}

async function viewCourse(courseId) {
  try {
    const course = await apiClient.getCourse(courseId)
    console.log("Viewing course:", course)
  } catch (error) {
    console.error("Failed to load course:", error)
    showNotification("Không thể tải thông tin khóa học!", "error")
  }
}

async function editCourse(courseId) {
  console.log("Editing course:", courseId)
}

async function viewExam(examId) {
  try {
    const exam = await apiClient.getExam(examId)
    console.log("Viewing exam:", exam)
  } catch (error) {
    console.error("Failed to load exam:", error)
    showNotification("Không thể tải thông tin kỳ thi!", "error")
  }
}

async function editExam(examId) {
  console.log("Editing exam:", examId)
}

async function joinWebinar(webinarId) {
  console.log("Joining webinar:", webinarId)
}

async function shareWebinar(webinarId) {
  console.log("Sharing webinar:", webinarId)
}

async function registerWebinar(webinarId) {
  console.log("Registering for webinar:", webinarId)
}

async function editWebinar(webinarId) {
  console.log("Editing webinar:", webinarId)
}

async function watchRecording(webinarId) {
  console.log("Watching recording:", webinarId)
}

async function downloadRecording(webinarId) {
  console.log("Downloading recording:", webinarId)
}

async function viewDocument(documentId) {
  try {
    const document = await apiClient.getLibraryDocument(documentId)
    console.log("Viewing document:", document)
  } catch (error) {
    console.error("Failed to load document:", error)
    showNotification("Không thể tải tài liệu!", "error")
  }
}

async function downloadDocument(documentId) {
  try {
    // In a real implementation, this would trigger a file download
    console.log("Downloading document:", documentId)
    showNotification("Đang tải xuống tài liệu...", "success")
  } catch (error) {
    console.error("Failed to download document:", error)
    showNotification("Không thể tải xuống tài liệu!", "error")
  }
}

// Modal Functions for Exams
function openCreateExamModal() {
  const modal = document.getElementById("createExamModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeCreateExamModal() {
  const modal = document.getElementById("createExamModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("createExamForm")
    if (form) form.reset()
  }
}

// Modal Functions for Webinars
function openCreateWebinarModal() {
  const modal = document.getElementById("createWebinarModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeCreateWebinarModal() {
  const modal = document.getElementById("createWebinarModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("createWebinarForm")
    if (form) form.reset()
  }
}

// Modal Functions for Library
function openUploadModal() {
  const modal = document.getElementById("uploadModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeUploadModal() {
  const modal = document.getElementById("uploadModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("uploadForm")
    if (form) form.reset()
  }
}

// Modal Functions for Forum
function openCreateTopicModal() {
  const modal = document.getElementById("createTopicModal")
  if (modal) {
    modal.classList.add("show")
  }
}

function closeCreateTopicModal() {
  const modal = document.getElementById("createTopicModal")
  if (modal) {
    modal.classList.remove("show")
    const form = document.getElementById("createTopicForm")
    if (form) form.reset()
  }
}

// Form Handlers for new pages
async function handleCreateExam(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const examData = {
    title: formData.get("examTitle"),
    description: formData.get("examDescription"),
    exam_date: formData.get("examDate"),
    duration_minutes: Number.parseInt(formData.get("examDuration")),
    total_questions: Number.parseInt(formData.get("examQuestions")),
    max_score: Number.parseInt(formData.get("examMaxScore")),
    course_id: formData.get("examCourse"),
  }

  try {
    await apiClient.createExam(examData)
    showNotification("Kỳ thi đã được tạo thành công!", "success")
    closeCreateExamModal()
    await loadExams()
  } catch (error) {
    console.error("Failed to create exam:", error)
    showNotification("Tạo kỳ thi thất bại!", "error")
  }
}

async function handleCreateWebinar(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const webinarData = {
    title: formData.get("webinarTitle"),
    description: formData.get("webinarDescription"),
    scheduled_date: formData.get("webinarDate"),
    duration_minutes: Number.parseInt(formData.get("webinarDuration")),
    max_participants: Number.parseInt(formData.get("webinarMaxParticipants")),
    webinar_type: formData.get("webinarType"),
  }

  try {
    await apiClient.createWebinar(webinarData)
    showNotification("Webinar đã được tạo thành công!", "success")
    closeCreateWebinarModal()
    await loadWebinars()
  } catch (error) {
    console.error("Failed to create webinar:", error)
    showNotification("Tạo webinar thất bại!", "error")
  }
}

// Export functions for global use
window.togglePassword = togglePassword
window.logout = logout
window.openCreateModal = openCreateModal
window.closeCreateModal = closeCreateModal
window.openAddStudentModal = openAddStudentModal
window.closeAddStudentModal = closeAddStudentModal
window.openCreateCourseModal = openCreateCourseModal
window.closeCreateCourseModal = closeCreateCourseModal
window.openCreateExamModal = openCreateExamModal
window.closeCreateExamModal = closeCreateExamModal
window.openCreateWebinarModal = openCreateWebinarModal
window.closeCreateWebinarModal = closeCreateWebinarModal
window.openUploadModal = openUploadModal
window.closeUploadModal = closeUploadModal
window.openCreateTopicModal = openCreateTopicModal
window.closeCreateTopicModal = closeCreateTopicModal
window.openAvatarModal = openAvatarModal
window.closeAvatarModal = closeAvatarModal
window.saveAvatar = saveAvatar

// Action handlers
window.viewAssignment = viewAssignment
window.gradeAssignment = gradeAssignment
window.viewStudent = viewStudent
window.contactStudent = contactStudent
window.viewCourse = viewCourse
window.editCourse = editCourse
window.viewExam = viewExam
window.editExam = editExam
window.joinWebinar = joinWebinar
window.shareWebinar = shareWebinar
window.registerWebinar = registerWebinar
window.editWebinar = editWebinar
window.watchRecording = watchRecording
window.downloadRecording = downloadRecording
window.viewDocument = viewDocument
window.downloadDocument = downloadDocument
