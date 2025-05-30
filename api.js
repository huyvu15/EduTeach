// API Configuration
const API_BASE_URL = "http://localhost:8000"

// API Client Class
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.token = localStorage.getItem("access_token")
  }

  // Set authorization token
  setToken(token) {
    this.token = token
    localStorage.setItem("access_token", token)
  }

  // Remove authorization token
  removeToken() {
    this.token = null
    localStorage.removeItem("access_token")
  }

  // Get authorization headers
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    return headers
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getHeaders(),
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken()
          window.location.href = "index.html"
          throw new Error("Unauthorized")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      }

      return response
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: "GET" })
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" })
  }

  // Upload file
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData()
    formData.append("file", file)

    // Add additional data to form
    Object.keys(additionalData).forEach((key) => {
      formData.append(key, additionalData[key])
    })

    const headers = {}
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    return this.request(endpoint, {
      method: "POST",
      headers,
      body: formData,
    })
  }

  // Authentication APIs
  async login(email, password) {
    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)

    const response = await fetch(`${this.baseURL}/token`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Login failed")
    }

    const data = await response.json()
    this.setToken(data.access_token)
    return data
  }

  async register(userData) {
    return this.post("/register", userData)
  }

  async getCurrentUser() {
    return this.get("/users/me")
  }

  // Dashboard APIs
  async getStatistics() {
    return this.get("/statistics")
  }

  // Course APIs
  async getCourses(skip = 0, limit = 100) {
    return this.get(`/courses?skip=${skip}&limit=${limit}`)
  }

  async createCourse(courseData) {
    return this.post("/courses", courseData)
  }

  async getCourse(courseId) {
    return this.get(`/courses/${courseId}`)
  }

  async updateCourse(courseId, courseData) {
    return this.put(`/courses/${courseId}`, courseData)
  }

  async deleteCourse(courseId) {
    return this.delete(`/courses/${courseId}`)
  }

  // Assignment APIs
  async getAssignments(skip = 0, limit = 100) {
    return this.get(`/assignments?skip=${skip}&limit=${limit}`)
  }

  async createAssignment(assignmentData) {
    return this.post("/assignments", assignmentData)
  }

  async getAssignment(assignmentId) {
    return this.get(`/assignments/${assignmentId}`)
  }

  async updateAssignment(assignmentId, assignmentData) {
    return this.put(`/assignments/${assignmentId}`, assignmentData)
  }

  async deleteAssignment(assignmentId) {
    return this.delete(`/assignments/${assignmentId}`)
  }

  // Exam APIs
  async getExams(skip = 0, limit = 100) {
    return this.get(`/exams?skip=${skip}&limit=${limit}`)
  }

  async createExam(examData) {
    return this.post("/exams", examData)
  }

  async getExam(examId) {
    return this.get(`/exams/${examId}`)
  }

  async updateExam(examId, examData) {
    return this.put(`/exams/${examId}`, examData)
  }

  async deleteExam(examId) {
    return this.delete(`/exams/${examId}`)
  }

  // Webinar APIs
  async getWebinars(skip = 0, limit = 100) {
    return this.get(`/webinars?skip=${skip}&limit=${limit}`)
  }

  async createWebinar(webinarData) {
    return this.post("/webinars", webinarData)
  }

  async getWebinar(webinarId) {
    return this.get(`/webinars/${webinarId}`)
  }

  async updateWebinar(webinarId, webinarData) {
    return this.put(`/webinars/${webinarId}`, webinarData)
  }

  async deleteWebinar(webinarId) {
    return this.delete(`/webinars/${webinarId}`)
  }

  // Student APIs
  async getStudents(skip = 0, limit = 100) {
    return this.get(`/students?skip=${skip}&limit=${limit}`)
  }

  async createStudent(studentData) {
    return this.post("/students", studentData)
  }

  async getStudent(studentId) {
    return this.get(`/students/${studentId}`)
  }

  async updateStudent(studentId, studentData) {
    return this.put(`/students/${studentId}`, studentData)
  }

  async deleteStudent(studentId) {
    return this.delete(`/students/${studentId}`)
  }

  // Library APIs
  async getLibraryDocuments(skip = 0, limit = 100, category = null) {
    let url = `/library?skip=${skip}&limit=${limit}`
    if (category) {
      url += `&category=${category}`
    }
    return this.get(url)
  }

  async createLibraryDocument(documentData) {
    return this.post("/library", documentData)
  }

  async uploadDocument(file, documentData) {
    return this.uploadFile("/library/upload", file, documentData)
  }

  async getLibraryDocument(documentId) {
    return this.get(`/library/${documentId}`)
  }

  async updateLibraryDocument(documentId, documentData) {
    return this.put(`/library/${documentId}`, documentData)
  }

  async deleteLibraryDocument(documentId) {
    return this.delete(`/library/${documentId}`)
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
    return this.post("/forum", topicData)
  }

  async getForumTopic(topicId) {
    return this.get(`/forum/${topicId}`)
  }

  async updateForumTopic(topicId, topicData) {
    return this.put(`/forum/${topicId}`, topicData)
  }

  async deleteForumTopic(topicId) {
    return this.delete(`/forum/${topicId}`)
  }

  // Notification APIs
  async getNotifications() {
    return this.get("/notifications")
  }

  async markNotificationAsRead(notificationId) {
    return this.put(`/notifications/${notificationId}/read`)
  }

  // Avatar APIs
  async uploadAvatar(file) {
    return this.uploadFile("/users/avatar", file)
  }

  async getAvailableAvatars() {
    return this.get("/avatars")
  }

  // Initialize sample data
  async initSampleData() {
    return this.post("/init-sample-data")
  }
}

// Create global API client instance
const apiClient = new APIClient()

// Export for use in other files
window.apiClient = apiClient
