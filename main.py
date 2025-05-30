from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import motor.motor_asyncio
from bson import ObjectId
import os
from pathlib import Path
import shutil
import uuid

# Configuration
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
database = client.eduteach

# FastAPI app
app = FastAPI(title="EduTeach API", description="API for Online Teaching Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "student"  # student, teacher, admin

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    level: str = "beginner"
    duration_hours: int
    price: float = 0.0

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: str
    instructor_id: str
    instructor_name: str
    status: str = "draft"
    enrolled_students: int = 0
    progress: int = 0
    image_url: Optional[str] = None
    created_at: datetime

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    max_score: int = 100

class AssignmentCreate(AssignmentBase):
    course_id: Optional[str] = None

class Assignment(AssignmentBase):
    id: str
    instructor_id: str
    course_id: Optional[str] = None
    status: str = "pending"
    created_at: datetime

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    exam_date: datetime
    duration_minutes: int
    total_questions: int = 0
    max_score: int = 100

class ExamCreate(ExamBase):
    course_id: Optional[str] = None

class Exam(ExamBase):
    id: str
    instructor_id: str
    course_id: Optional[str] = None
    status: str = "upcoming"
    created_at: datetime

class WebinarBase(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    duration_minutes: int
    max_participants: Optional[int] = None
    webinar_type: str = "live"

class WebinarCreate(WebinarBase):
    pass

class Webinar(WebinarBase):
    id: str
    instructor_id: str
    status: str = "upcoming"
    registered_count: int = 0
    thumbnail_url: Optional[str] = None
    created_at: datetime

class StudentBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    notes: Optional[str] = None

class StudentCreate(StudentBase):
    course_id: Optional[str] = None

class Student(StudentBase):
    id: str
    course_id: Optional[str] = None
    is_active: bool = True
    progress: int = 0
    completed_assignments: int = 0
    average_score: float = 0.0
    avatar_url: Optional[str] = None
    created_at: datetime

class LibraryDocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    file_type: str
    is_public: bool = True

class LibraryDocumentCreate(LibraryDocumentBase):
    course_id: Optional[str] = None

class LibraryDocument(LibraryDocumentBase):
    id: str
    author_id: str
    author_name: str
    course_id: Optional[str] = None
    file_url: str
    file_size: int
    views: int = 0
    downloads: int = 0
    created_at: datetime

class ForumTopicBase(BaseModel):
    title: str
    content: str
    category: str = "general"
    tags: List[str] = []
    is_pinned: bool = False

class ForumTopicCreate(ForumTopicBase):
    pass

class ForumTopic(ForumTopicBase):
    id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    views: int = 0
    replies: int = 0
    created_at: datetime

class Statistics(BaseModel):
    total_courses: int
    total_assignments: int
    total_students: int
    total_exams: int
    total_webinars: int
    total_library_documents: int
    total_forum_topics: int
    completed_assignments: int
    average_score: float

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await database.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    user["id"] = str(user["_id"])
    return User(**user)

def convert_objectid(doc):
    """Convert MongoDB ObjectId to string"""
    if doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# Authentication endpoints
@app.post("/register", response_model=User)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await database.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True
    
    result = await database.users.insert_one(user_dict)
    created_user = await database.users.find_one({"_id": result.inserted_id})
    
    return User(**convert_objectid(created_user))

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await database.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Avatar endpoints
@app.post("/users/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{filename}"
    await database.users.update_one(
        {"email": current_user.email},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    return {"avatar_url": avatar_url}

@app.get("/avatars")
async def get_available_avatars():
    # Return list of predefined avatars
    avatars = [
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
    ]
    return {"avatars": avatars}

# Course endpoints
@app.get("/courses", response_model=List[Course])
async def get_courses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    courses = []
    async for course in database.courses.find().skip(skip).limit(limit):
        course_data = convert_objectid(course)
        courses.append(Course(**course_data))
    return courses

@app.post("/courses", response_model=Course)
async def create_course(
    course: CourseCreate,
    current_user: User = Depends(get_current_user)
):
    course_dict = course.dict()
    course_dict["instructor_id"] = current_user.id
    course_dict["instructor_name"] = current_user.full_name
    course_dict["created_at"] = datetime.utcnow()
    course_dict["status"] = "draft"
    course_dict["enrolled_students"] = 0
    course_dict["progress"] = 0
    
    result = await database.courses.insert_one(course_dict)
    created_course = await database.courses.find_one({"_id": result.inserted_id})
    
    return Course(**convert_objectid(created_course))

@app.get("/courses/{course_id}", response_model=Course)
async def get_course(
    course_id: str,
    current_user: User = Depends(get_current_user)
):
    course = await database.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return Course(**convert_objectid(course))

# Assignment endpoints
@app.get("/assignments", response_model=List[Assignment])
async def get_assignments(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    assignments = []
    async for assignment in database.assignments.find().skip(skip).limit(limit):
        assignment_data = convert_objectid(assignment)
        assignments.append(Assignment(**assignment_data))
    return assignments

@app.post("/assignments", response_model=Assignment)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user: User = Depends(get_current_user)
):
    assignment_dict = assignment.dict()
    assignment_dict["instructor_id"] = current_user.id
    assignment_dict["created_at"] = datetime.utcnow()
    assignment_dict["status"] = "pending"
    
    result = await database.assignments.insert_one(assignment_dict)
    created_assignment = await database.assignments.find_one({"_id": result.inserted_id})
    
    return Assignment(**convert_objectid(created_assignment))

@app.get("/assignments/{assignment_id}", response_model=Assignment)
async def get_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user)
):
    assignment = await database.assignments.find_one({"_id": ObjectId(assignment_id)})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return Assignment(**convert_objectid(assignment))

# Exam endpoints
@app.get("/exams", response_model=List[Exam])
async def get_exams(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    exams = []
    async for exam in database.exams.find().skip(skip).limit(limit):
        exam_data = convert_objectid(exam)
        exams.append(Exam(**exam_data))
    return exams

@app.post("/exams", response_model=Exam)
async def create_exam(
    exam: ExamCreate,
    current_user: User = Depends(get_current_user)
):
    exam_dict = exam.dict()
    exam_dict["instructor_id"] = current_user.id
    exam_dict["created_at"] = datetime.utcnow()
    exam_dict["status"] = "upcoming"
    
    result = await database.exams.insert_one(exam_dict)
    created_exam = await database.exams.find_one({"_id": result.inserted_id})
    
    return Exam(**convert_objectid(created_exam))

@app.get("/exams/{exam_id}", response_model=Exam)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user)
):
    exam = await database.exams.find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return Exam(**convert_objectid(exam))

# Webinar endpoints
@app.get("/webinars", response_model=List[Webinar])
async def get_webinars(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    webinars = []
    async for webinar in database.webinars.find().skip(skip).limit(limit):
        webinar_data = convert_objectid(webinar)
        webinars.append(Webinar(**webinar_data))
    return webinars

@app.post("/webinars", response_model=Webinar)
async def create_webinar(
    webinar: WebinarCreate,
    current_user: User = Depends(get_current_user)
):
    webinar_dict = webinar.dict()
    webinar_dict["instructor_id"] = current_user.id
    webinar_dict["created_at"] = datetime.utcnow()
    webinar_dict["status"] = "upcoming"
    webinar_dict["registered_count"] = 0
    
    result = await database.webinars.insert_one(webinar_dict)
    created_webinar = await database.webinars.find_one({"_id": result.inserted_id})
    
    return Webinar(**convert_objectid(created_webinar))

@app.get("/webinars/{webinar_id}", response_model=Webinar)
async def get_webinar(
    webinar_id: str,
    current_user: User = Depends(get_current_user)
):
    webinar = await database.webinars.find_one({"_id": ObjectId(webinar_id)})
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    
    return Webinar(**convert_objectid(webinar))

# Student endpoints
@app.get("/students", response_model=List[Student])
async def get_students(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    students = []
    async for student in database.students.find().skip(skip).limit(limit):
        student_data = convert_objectid(student)
        students.append(Student(**student_data))
    return students

@app.post("/students", response_model=Student)
async def create_student(
    student: StudentCreate,
    current_user: User = Depends(get_current_user)
):
    student_dict = student.dict()
    student_dict["created_at"] = datetime.utcnow()
    student_dict["is_active"] = True
    student_dict["progress"] = 0
    student_dict["completed_assignments"] = 0
    student_dict["average_score"] = 0.0
    
    result = await database.students.insert_one(student_dict)
    created_student = await database.students.find_one({"_id": result.inserted_id})
    
    return Student(**convert_objectid(created_student))

@app.get("/students/{student_id}", response_model=Student)
async def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user)
):
    student = await database.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return Student(**convert_objectid(student))

# Library endpoints
@app.get("/library", response_model=List[LibraryDocument])
async def get_library_documents(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    
    documents = []
    async for doc in database.library.find(query).skip(skip).limit(limit):
        doc_data = convert_objectid(doc)
        documents.append(LibraryDocument(**doc_data))
    return documents

@app.post("/library", response_model=LibraryDocument)
async def create_library_document(
    document: LibraryDocumentCreate,
    current_user: User = Depends(get_current_user)
):
    doc_dict = document.dict()
    doc_dict["author_id"] = current_user.id
    doc_dict["author_name"] = current_user.full_name
    doc_dict["created_at"] = datetime.utcnow()
    doc_dict["file_url"] = ""  # Will be set when file is uploaded
    doc_dict["file_size"] = 0
    doc_dict["views"] = 0
    doc_dict["downloads"] = 0
    
    result = await database.library.insert_one(doc_dict)
    created_doc = await database.library.find_one({"_id": result.inserted_id})
    
    return LibraryDocument(**convert_objectid(created_doc))

@app.post("/library/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form(...),
    course_id: str = Form(None),
    is_public: bool = Form(True),
    current_user: User = Depends(get_current_user)
):
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create document record
    doc_dict = {
        "title": title,
        "description": description,
        "category": category,
        "file_type": file_extension,
        "is_public": is_public,
        "course_id": course_id,
        "author_id": current_user.id,
        "author_name": current_user.full_name,
        "file_url": f"/uploads/documents/{filename}",
        "file_size": file.size,
        "views": 0,
        "downloads": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await database.library.insert_one(doc_dict)
    created_doc = await database.library.find_one({"_id": result.inserted_id})
    
    return LibraryDocument(**convert_objectid(created_doc))

@app.get("/library/{document_id}", response_model=LibraryDocument)
async def get_library_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    document = await database.library.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Increment view count
    await database.library.update_one(
        {"_id": ObjectId(document_id)},
        {"$inc": {"views": 1}}
    )
    
    return LibraryDocument(**convert_objectid(document))

# Forum endpoints
@app.get("/forum", response_model=List[ForumTopic])
async def get_forum_topics(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    
    topics = []
    async for topic in database.forum.find(query).skip(skip).limit(limit):
        topic_data = convert_objectid(topic)
        topics.append(ForumTopic(**topic_data))
    return topics

@app.post("/forum", response_model=ForumTopic)
async def create_forum_topic(
    topic: ForumTopicCreate,
    current_user: User = Depends(get_current_user)
):
    topic_dict = topic.dict()
    topic_dict["author_id"] = current_user.id
    topic_dict["author_name"] = current_user.full_name
    topic_dict["author_avatar"] = current_user.avatar_url
    topic_dict["created_at"] = datetime.utcnow()
    topic_dict["views"] = 0
    topic_dict["replies"] = 0
    
    result = await database.forum.insert_one(topic_dict)
    created_topic = await database.forum.find_one({"_id": result.inserted_id})
    
    return ForumTopic(**convert_objectid(created_topic))

@app.get("/forum/{topic_id}", response_model=ForumTopic)
async def get_forum_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user)
):
    topic = await database.forum.find_one({"_id": ObjectId(topic_id)})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Increment view count
    await database.forum.update_one(
        {"_id": ObjectId(topic_id)},
        {"$inc": {"views": 1}}
    )
    
    return ForumTopic(**convert_objectid(topic))

# Statistics endpoint
@app.get("/statistics", response_model=Statistics)
async def get_statistics(current_user: User = Depends(get_current_user)):
    total_courses = await database.courses.count_documents({})
    total_assignments = await database.assignments.count_documents({})
    total_students = await database.students.count_documents({})
    total_exams = await database.exams.count_documents({})
    total_webinars = await database.webinars.count_documents({})
    total_library_documents = await database.library.count_documents({})
    total_forum_topics = await database.forum.count_documents({})
    completed_assignments = await database.assignments.count_documents({"status": "completed"})
    
    # Calculate average score (mock data for now)
    average_score = 8.5
    
    return Statistics(
        total_courses=total_courses,
        total_assignments=total_assignments,
        total_students=total_students,
        total_exams=total_exams,
        total_webinars=total_webinars,
        total_library_documents=total_library_documents,
        total_forum_topics=total_forum_topics,
        completed_assignments=completed_assignments,
        average_score=average_score
    )

# Notifications endpoint
@app.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    # Mock notifications data
    notifications = [
        {
            "id": "1",
            "title": "Bài tập mới được nộp",
            "message": "Nguyễn Thị B đã nộp bài tập JavaScript cơ bản",
            "type": "assignment",
            "is_read": False,
            "created_at": datetime.utcnow() - timedelta(minutes=2)
        },
        {
            "id": "2",
            "title": "Học viên mới đăng ký",
            "message": "Trần Văn C đã đăng ký khóa học React Advanced",
            "type": "enrollment",
            "is_read": False,
            "created_at": datetime.utcnow() - timedelta(hours=1)
        },
        {
            "id": "3",
            "title": "Webinar sắp diễn ra",
            "message": "Webinar JavaScript ES6+ sẽ bắt đầu trong 30 phút",
            "type": "webinar",
            "is_read": True,
            "created_at": datetime.utcnow() - timedelta(hours=2)
        }
    ]
    return {"notifications": notifications}

@app.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    # In a real implementation, update the notification in the database
    return {"message": "Notification marked as read"}

# Initialize sample data
@app.post("/init-sample-data")
async def init_sample_data():
    # Check if data already exists
    existing_users = await database.users.count_documents({})
    if existing_users > 0:
        return {"message": "Sample data already exists"}
    
    # Create sample users
    sample_users = [
        {
            "email": "admin@example.com",
            "password": get_password_hash("admin123"),
            "full_name": "Admin User",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "email": "teacher@example.com",
            "password": get_password_hash("teacher123"),
            "full_name": "GS. Nguyễn Văn A",
            "role": "teacher",
            "is_active": True,
            "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
            "created_at": datetime.utcnow()
        },
        {
            "email": "student1@example.com",
            "password": get_password_hash("student123"),
            "full_name": "Nguyễn Thị B",
            "role": "student",
            "is_active": True,
            "avatar_url": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
            "created_at": datetime.utcnow()
        }
    ]
    
    await database.users.insert_many(sample_users)
    
    # Get teacher user for foreign keys
    teacher = await database.users.find_one({"email": "teacher@example.com"})
    teacher_id = str(teacher["_id"])
    
    # Create sample courses
    sample_courses = [
        {
            "title": "JavaScript cơ bản",
            "description": "Khóa học JavaScript từ cơ bản đến nâng cao",
            "category": "programming",
            "level": "beginner",
            "duration_hours": 40,
            "price": 500000,
            "instructor_id": teacher_id,
            "instructor_name": "GS. Nguyễn Văn A",
            "status": "active",
            "enrolled_students": 45,
            "progress": 75,
            "created_at": datetime.utcnow()
        },
        {
            "title": "React Advanced",
            "description": "Khóa học React nâng cao với Redux và TypeScript",
            "category": "programming",
            "level": "advanced",
            "duration_hours": 60,
            "price": 800000,
            "instructor_id": teacher_id,
            "instructor_name": "GS. Nguyễn Văn A",
            "status": "active",
            "enrolled_students": 32,
            "progress": 60,
            "created_at": datetime.utcnow()
        }
    ]
    
    await database.courses.insert_many(sample_courses)
    
    # Create sample assignments
    sample_assignments = [
        {
            "title": "Bài tập HTML Forms",
            "description": "Tạo form đăng ký với validation",
            "due_date": datetime.utcnow() + timedelta(days=7),
            "max_score": 100,
            "instructor_id": teacher_id,
            "status": "pending",
            "created_at": datetime.utcnow()
        },
        {
            "title": "Bài tập CSS Flexbox",
            "description": "Tạo layout responsive với Flexbox",
            "due_date": datetime.utcnow() + timedelta(days=3),
            "max_score": 100,
            "instructor_id": teacher_id,
            "status": "completed",
            "created_at": datetime.utcnow()
        }
    ]
    
    await database.assignments.insert_many(sample_assignments)
    
    # Create sample students
    sample_students = [
        {
            "full_name": "Nguyễn Thị B",
            "email": "student1@example.com",
            "phone": "0123456789",
            "is_active": True,
            "progress": 75,
            "completed_assignments": 8,
            "average_score": 8.5,
            "avatar_url": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
            "created_at": datetime.utcnow()
        },
        {
            "full_name": "Trần Văn C",
            "email": "student2@example.com",
            "phone": "0123456790",
            "is_active": True,
            "progress": 92,
            "completed_assignments": 12,
            "average_score": 9.2,
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
            "created_at": datetime.utcnow()
        }
    ]
    
    await database.students.insert_many(sample_students)
    
    return {"message": "Sample data initialized successfully"}

# Add GET endpoint for easy browser testing
@app.get("/init-sample-data")
async def init_sample_data_get():
    return await init_sample_data()

# Add endpoint to check users
@app.get("/check-users")
async def check_users():
    users = []
    async for user in database.users.find():
        user_data = convert_objectid(user)
        # Don't return password
        user_data.pop("password", None)
        users.append(user_data)
    return {"users": users, "count": len(users)}

# Add health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        await database.command("ping")
        
        # Count documents in collections
        users_count = await database.users.count_documents({})
        courses_count = await database.courses.count_documents({})
        
        return {
            "status": "healthy", 
            "database": "connected",
            "users": users_count,
            "courses": courses_count
        }
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
