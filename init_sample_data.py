"""
Sample Data Generator for EduTeach API
This script generates comprehensive sample data for all API endpoints
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime, timedelta
from passlib.context import CryptContext
from bson import ObjectId
import random

# Configuration
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "eduteach"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

class SampleDataGenerator:
    def __init__(self):
        self.client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        self.database = self.client[DATABASE_NAME]
        self.users = []
        self.courses = []
        self.assignments = []
        self.exams = []
        self.webinars = []
        self.students = []
        self.library_docs = []
        self.forum_topics = []

    async def clear_all_data(self):
        """Clear all existing data"""
        print("🗑️  Clearing existing data...")
        collections = ['users', 'courses', 'assignments', 'exams', 'webinars', 
                      'students', 'library', 'forum']
        
        for collection in collections:
            await self.database[collection].delete_many({})
        
        print("✅ All data cleared!")

    async def create_users(self):
        """Create sample users (admin, teachers, students)"""
        print("👥 Creating users...")
        
        users_data = [
            # Admin
            {
                "email": "admin@example.com",
                "password": get_password_hash("admin123"),
                "full_name": "Administrator",
                "role": "admin",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            # Teachers
            {
                "email": "teacher@example.com",
                "password": get_password_hash("teacher123"),
                "full_name": "GS. Nguyễn Văn A",
                "role": "teacher",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            {
                "email": "teacher2@example.com",
                "password": get_password_hash("teacher123"),
                "full_name": "TS. Trần Thị B",
                "role": "teacher",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            {
                "email": "teacher3@example.com",
                "password": get_password_hash("teacher123"),
                "full_name": "ThS. Lê Văn C",
                "role": "teacher",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            # Students
            {
                "email": "student1@example.com",
                "password": get_password_hash("student123"),
                "full_name": "Nguyễn Thị D",
                "role": "student",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            {
                "email": "student2@example.com",
                "password": get_password_hash("student123"),
                "full_name": "Trần Văn E",
                "role": "student",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            },
            {
                "email": "student3@example.com",
                "password": get_password_hash("student123"),
                "full_name": "Phạm Thị F",
                "role": "student",
                "is_active": True,
                "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
                "created_at": datetime.utcnow()
            }
        ]
        
        result = await self.database.users.insert_many(users_data)
        
        # Store users for reference
        for i, user_id in enumerate(result.inserted_ids):
            user_data = users_data[i].copy()
            user_data['_id'] = user_id
            self.users.append(user_data)
        
        print(f"✅ Created {len(users_data)} users!")

    async def create_courses(self):
        """Create sample courses"""
        print("📚 Creating courses...")
        
        # Get teachers
        teachers = [user for user in self.users if user['role'] == 'teacher']
        
        courses_data = [
            {
                "title": "JavaScript cơ bản",
                "description": "Khóa học JavaScript từ cơ bản đến nâng cao, bao gồm ES6+, DOM manipulation, và async programming",
                "category": "programming",
                "level": "beginner",
                "duration_hours": 40,
                "price": 500000,
                "instructor_id": str(teachers[0]['_id']),
                "instructor_name": teachers[0]['full_name'],
                "status": "active",
                "enrolled_students": 45,
                "progress": 75,
                "image_url": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=180&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "React Advanced",
                "description": "Khóa học React nâng cao với Redux, TypeScript, và các patterns hiện đại",
                "category": "programming",
                "level": "advanced",
                "duration_hours": 60,
                "price": 800000,
                "instructor_id": str(teachers[0]['_id']),
                "instructor_name": teachers[0]['full_name'],
                "status": "active",
                "enrolled_students": 32,
                "progress": 60,
                "image_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=180&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Python for Data Science",
                "description": "Học Python cho khoa học dữ liệu với pandas, numpy, matplotlib và machine learning",
                "category": "data-science",
                "level": "intermediate",
                "duration_hours": 50,
                "price": 700000,
                "instructor_id": str(teachers[1]['_id']),
                "instructor_name": teachers[1]['full_name'],
                "status": "active",
                "enrolled_students": 28,
                "progress": 40,
                "image_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=180&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "UI/UX Design Fundamentals",
                "description": "Các nguyên tắc cơ bản về thiết kế UI/UX, từ wireframe đến prototype",
                "category": "design",
                "level": "beginner",
                "duration_hours": 35,
                "price": 600000,
                "instructor_id": str(teachers[2]['_id']),
                "instructor_name": teachers[2]['full_name'],
                "status": "draft",
                "enrolled_students": 0,
                "progress": 0,
                "image_url": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&h=180&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Node.js Backend Development",
                "description": "Xây dựng REST API với Node.js, Express, và MongoDB",
                "category": "programming",
                "level": "intermediate",
                "duration_hours": 45,
                "price": 650000,
                "instructor_id": str(teachers[0]['_id']),
                "instructor_name": teachers[0]['full_name'],
                "status": "completed",
                "enrolled_students": 38,
                "progress": 100,
                "image_url": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=180&fit=crop",
                "created_at": datetime.utcnow() - timedelta(days=30)
            }
        ]
        
        result = await self.database.courses.insert_many(courses_data)
        
        # Store courses for reference
        for i, course_id in enumerate(result.inserted_ids):
            course_data = courses_data[i].copy()
            course_data['_id'] = course_id
            self.courses.append(course_data)
        
        print(f"✅ Created {len(courses_data)} courses!")

    async def create_assignments(self):
        """Create sample assignments"""
        print("📝 Creating assignments...")
        
        teachers = [user for user in self.users if user['role'] == 'teacher']
        
        assignments_data = [
            {
                "title": "Bài tập HTML Forms",
                "description": "Tạo form đăng ký với validation sử dụng HTML5 và JavaScript",
                "due_date": datetime.utcnow() + timedelta(days=7),
                "max_score": 100,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Bài tập CSS Flexbox",
                "description": "Tạo layout responsive với CSS Flexbox và Grid",
                "due_date": datetime.utcnow() + timedelta(days=3),
                "max_score": 100,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "status": "completed",
                "created_at": datetime.utcnow()
            },
            {
                "title": "React Component Design",
                "description": "Xây dựng các React components có thể tái sử dụng",
                "due_date": datetime.utcnow() + timedelta(days=10),
                "max_score": 150,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[1]['_id']) if len(self.courses) > 1 else None,
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Data Analysis với Pandas",
                "description": "Phân tích dataset COVID-19 sử dụng thư viện Pandas",
                "due_date": datetime.utcnow() + timedelta(days=14),
                "max_score": 120,
                "instructor_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "course_id": str(self.courses[2]['_id']) if len(self.courses) > 2 else None,
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "title": "API Documentation",
                "description": "Viết tài liệu API cho dự án Node.js",
                "due_date": datetime.utcnow() - timedelta(days=2),
                "max_score": 80,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[4]['_id']) if len(self.courses) > 4 else None,
                "status": "overdue",
                "created_at": datetime.utcnow() - timedelta(days=5)
            }
        ]
        
        result = await self.database.assignments.insert_many(assignments_data)
        
        # Store assignments for reference
        for i, assignment_id in enumerate(result.inserted_ids):
            assignment_data = assignments_data[i].copy()
            assignment_data['_id'] = assignment_id
            self.assignments.append(assignment_data)
        
        print(f"✅ Created {len(assignments_data)} assignments!")

    async def create_exams(self):
        """Create sample exams"""
        print("📋 Creating exams...")
        
        teachers = [user for user in self.users if user['role'] == 'teacher']
        
        exams_data = [
            {
                "title": "Kiểm tra giữa kỳ JavaScript",
                "description": "Kiểm tra kiến thức JavaScript cơ bản và ES6",
                "exam_date": datetime.utcnow() + timedelta(days=5),
                "duration_minutes": 90,
                "total_questions": 30,
                "max_score": 100,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "status": "upcoming",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Final Test React",
                "description": "Bài kiểm tra cuối khóa React Advanced",
                "exam_date": datetime.utcnow() + timedelta(days=20),
                "duration_minutes": 120,
                "total_questions": 40,
                "max_score": 150,
                "instructor_id": str(teachers[0]['_id']),
                "course_id": str(self.courses[1]['_id']) if len(self.courses) > 1 else None,
                "status": "upcoming",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Python Quiz",
                "description": "Bài kiểm tra nhanh về Python basics",
                "exam_date": datetime.utcnow() - timedelta(days=3),
                "duration_minutes": 45,
                "total_questions": 20,
                "max_score": 80,
                "instructor_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "course_id": str(self.courses[2]['_id']) if len(self.courses) > 2 else None,
                "status": "completed",
                "created_at": datetime.utcnow() - timedelta(days=7)
            },
            {
                "title": "UX Design Principles",
                "description": "Kiểm tra các nguyên tắc thiết kế UX",
                "exam_date": datetime.utcnow() + timedelta(hours=2),
                "duration_minutes": 60,
                "total_questions": 25,
                "max_score": 100,
                "instructor_id": str(teachers[2]['_id']) if len(teachers) > 2 else str(teachers[0]['_id']),
                "course_id": str(self.courses[3]['_id']) if len(self.courses) > 3 else None,
                "status": "ongoing",
                "created_at": datetime.utcnow()
            }
        ]
        
        result = await self.database.exams.insert_many(exams_data)
        
        # Store exams for reference
        for i, exam_id in enumerate(result.inserted_ids):
            exam_data = exams_data[i].copy()
            exam_data['_id'] = exam_id
            self.exams.append(exam_data)
        
        print(f"✅ Created {len(exams_data)} exams!")

    async def create_webinars(self):
        """Create sample webinars"""
        print("🎥 Creating webinars...")
        
        teachers = [user for user in self.users if user['role'] == 'teacher']
        
        webinars_data = [
            {
                "title": "JavaScript ES6+ Features",
                "description": "Tìm hiểu các tính năng mới trong JavaScript ES6 và các phiên bản sau",
                "scheduled_date": datetime.utcnow() + timedelta(days=2, hours=14),
                "duration_minutes": 90,
                "max_participants": 100,
                "webinar_type": "live",
                "instructor_id": str(teachers[0]['_id']),
                "status": "upcoming",
                "registered_count": 45,
                "thumbnail_url": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=225&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "React Hooks Deep Dive",
                "description": "Khám phá sâu về React Hooks và custom hooks",
                "scheduled_date": datetime.utcnow() + timedelta(days=7, hours=19),
                "duration_minutes": 120,
                "max_participants": 80,
                "webinar_type": "live",
                "instructor_id": str(teachers[0]['_id']),
                "status": "upcoming",
                "registered_count": 32,
                "thumbnail_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
                "created_at": datetime.utcnow()
            },
            {
                "title": "Data Visualization với Python",
                "description": "Tạo biểu đồ và visualization với matplotlib và seaborn",
                "scheduled_date": datetime.utcnow() - timedelta(days=5),
                "duration_minutes": 105,
                "max_participants": 60,
                "webinar_type": "recorded",
                "instructor_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "status": "completed",
                "registered_count": 58,
                "thumbnail_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=225&fit=crop",
                "created_at": datetime.utcnow() - timedelta(days=10)
            },
            {
                "title": "Design System Best Practices",
                "description": "Xây dựng design system hiệu quả cho sản phẩm",
                "scheduled_date": datetime.utcnow() + timedelta(days=12, hours=16),
                "duration_minutes": 75,
                "max_participants": 50,
                "webinar_type": "live",
                "instructor_id": str(teachers[2]['_id']) if len(teachers) > 2 else str(teachers[0]['_id']),
                "status": "upcoming",
                "registered_count": 23,
                "thumbnail_url": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=225&fit=crop",
                "created_at": datetime.utcnow()
            }
        ]
        
        result = await self.database.webinars.insert_many(webinars_data)
        
        # Store webinars for reference
        for i, webinar_id in enumerate(result.inserted_ids):
            webinar_data = webinars_data[i].copy()
            webinar_data['_id'] = webinar_id
            self.webinars.append(webinar_data)
        
        print(f"✅ Created {len(webinars_data)} webinars!")

    async def create_students(self):
        """Create sample students with realistic data"""
        print("🎓 Creating students...")
        
        students_data = [
            {
                "full_name": "Nguyễn Văn Minh",
                "email": "minh.nguyen@student.edu",
                "phone": "0901234567",
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "is_active": True,
                "progress": 85,
                "completed_assignments": 8,
                "average_score": 8.7,
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
                "notes": "Học viên tích cực, hoàn thành bài tập đúng hạn",
                "created_at": datetime.utcnow() - timedelta(days=30)
            },
            {
                "full_name": "Trần Thị Lan",
                "email": "lan.tran@student.edu",
                "phone": "0912345678",
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "is_active": True,
                "progress": 92,
                "completed_assignments": 10,
                "average_score": 9.2,
                "avatar_url": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
                "notes": "Học viên xuất sắc, có khả năng lãnh đạo nhóm",
                "created_at": datetime.utcnow() - timedelta(days=25)
            },
            {
                "full_name": "Lê Hoàng Nam",
                "email": "nam.le@student.edu",
                "phone": "0923456789",
                "course_id": str(self.courses[1]['_id']) if len(self.courses) > 1 else None,
                "is_active": True,
                "progress": 67,
                "completed_assignments": 5,
                "average_score": 7.5,
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
                "notes": "Cần hỗ trợ thêm về các khái niệm nâng cao",
                "created_at": datetime.utcnow() - timedelta(days=20)
            },
            {
                "full_name": "Phạm Thị Hoa",
                "email": "hoa.pham@student.edu",
                "phone": "0934567890",
                "course_id": str(self.courses[2]['_id']) if len(self.courses) > 2 else None,
                "is_active": True,
                "progress": 78,
                "completed_assignments": 7,
                "average_score": 8.1,
                "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
                "notes": "Thích thú với data science, có nhiều câu hỏi hay",
                "created_at": datetime.utcnow() - timedelta(days=18)
            },
            {
                "full_name": "Vũ Minh Tuấn",
                "email": "tuan.vu@student.edu",
                "phone": "0945678901",
                "course_id": str(self.courses[1]['_id']) if len(self.courses) > 1 else None,
                "is_active": False,
                "progress": 45,
                "completed_assignments": 3,
                "average_score": 6.8,
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
                "notes": "Tạm nghỉ học do bận công việc",
                "created_at": datetime.utcnow() - timedelta(days=15)
            },
            {
                "full_name": "Đỗ Thị Mai",
                "email": "mai.do@student.edu",
                "phone": "0956789012",
                "course_id": str(self.courses[3]['_id']) if len(self.courses) > 3 else None,
                "is_active": True,
                "progress": 30,
                "completed_assignments": 2,
                "average_score": 7.0,
                "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
                "notes": "Mới bắt đầu, có background design",
                "created_at": datetime.utcnow() - timedelta(days=10)
            }
        ]
        
        result = await self.database.students.insert_many(students_data)
        
        # Store students for reference
        for i, student_id in enumerate(result.inserted_ids):
            student_data = students_data[i].copy()
            student_data['_id'] = student_id
            self.students.append(student_data)
        
        print(f"✅ Created {len(students_data)} students!")

    async def create_library_documents(self):
        """Create sample library documents"""
        print("📖 Creating library documents...")
        
        teachers = [user for user in self.users if user['role'] == 'teacher']
        
        library_data = [
            {
                "title": "JavaScript ES6 Cheat Sheet",
                "description": "Tổng hợp các tính năng ES6 quan trọng với ví dụ",
                "category": "reference",
                "file_type": "pdf",
                "is_public": True,
                "course_id": str(self.courses[0]['_id']) if self.courses else None,
                "author_id": str(teachers[0]['_id']),
                "author_name": teachers[0]['full_name'],
                "file_url": "/uploads/documents/js-es6-cheatsheet.pdf",
                "file_size": 1024000,
                "views": 245,
                "downloads": 89,
                "created_at": datetime.utcnow() - timedelta(days=5)
            },
            {
                "title": "React Best Practices Guide",
                "description": "Hướng dẫn các best practices khi phát triển ứng dụng React",
                "category": "tutorial",
                "file_type": "pdf",
                "is_public": True,
                "course_id": str(self.courses[1]['_id']) if len(self.courses) > 1 else None,
                "author_id": str(teachers[0]['_id']),
                "author_name": teachers[0]['full_name'],
                "file_url": "/uploads/documents/react-best-practices.pdf",
                "file_size": 2048000,
                "views": 178,
                "downloads": 67,
                "created_at": datetime.utcnow() - timedelta(days=8)
            },
            {
                "title": "Python Data Types Reference",
                "description": "Tham khảo các kiểu dữ liệu trong Python với examples",
                "category": "reference",
                "file_type": "docx",
                "is_public": True,
                "course_id": str(self.courses[2]['_id']) if len(self.courses) > 2 else None,
                "author_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "author_name": teachers[1]['full_name'] if len(teachers) > 1 else teachers[0]['full_name'],
                "file_url": "/uploads/documents/python-data-types.docx",
                "file_size": 512000,
                "views": 156,
                "downloads": 78,
                "created_at": datetime.utcnow() - timedelta(days=12)
            },
            {
                "title": "UI Design Templates",
                "description": "Collection of UI design templates for web applications",
                "category": "template",
                "file_type": "sketch",
                "is_public": True,
                "course_id": str(self.courses[3]['_id']) if len(self.courses) > 3 else None,
                "author_id": str(teachers[2]['_id']) if len(teachers) > 2 else str(teachers[0]['_id']),
                "author_name": teachers[2]['full_name'] if len(teachers) > 2 else teachers[0]['full_name'],
                "file_url": "/uploads/documents/ui-templates.sketch",
                "file_size": 15360000,
                "views": 203,
                "downloads": 45,
                "created_at": datetime.utcnow() - timedelta(days=15)
            },
            {
                "title": "Node.js Project Structure",
                "description": "Hướng dẫn cấu trúc project Node.js chuẩn",
                "category": "tutorial",
                "file_type": "md",
                "is_public": True,
                "course_id": str(self.courses[4]['_id']) if len(self.courses) > 4 else None,
                "author_id": str(teachers[0]['_id']),
                "author_name": teachers[0]['full_name'],
                "file_url": "/uploads/documents/nodejs-structure.md",
                "file_size": 256000,
                "views": 134,
                "downloads": 56,
                "created_at": datetime.utcnow() - timedelta(days=20)
            },
            {
                "title": "Database Design Principles",
                "description": "Các nguyên tắc thiết kế database hiệu quả",
                "category": "reference",
                "file_type": "pptx",
                "is_public": False,
                "course_id": None,
                "author_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "author_name": teachers[1]['full_name'] if len(teachers) > 1 else teachers[0]['full_name'],
                "file_url": "/uploads/documents/database-design.pptx",
                "file_size": 3072000,
                "views": 89,
                "downloads": 34,
                "created_at": datetime.utcnow() - timedelta(days=25)
            }
        ]
        
        result = await self.database.library.insert_many(library_data)
        
        # Store library docs for reference
        for i, doc_id in enumerate(result.inserted_ids):
            doc_data = library_data[i].copy()
            doc_data['_id'] = doc_id
            self.library_docs.append(doc_data)
        
        print(f"✅ Created {len(library_data)} library documents!")

    async def create_forum_topics(self):
        """Create sample forum topics"""
        print("💬 Creating forum topics...")
        
        teachers = [user for user in self.users if user['role'] == 'teacher']
        students = [user for user in self.users if user['role'] == 'student']
        all_users = teachers + students
        
        forum_data = [
            {
                "title": "Làm thế nào để optimize performance React app?",
                "content": "Mình đang phát triển một ứng dụng React khá lớn và thấy performance không được tốt. Các bạn có thể chia sẻ kinh nghiệm optimize không?",
                "category": "programming",
                "tags": ["react", "performance", "optimization"],
                "is_pinned": False,
                "author_id": str(random.choice(students)['_id']),
                "author_name": random.choice(students)['full_name'],
                "author_avatar": random.choice(students)['avatar_url'],
                "views": 45,
                "replies": 8,
                "created_at": datetime.utcnow() - timedelta(days=2)
            },
            {
                "title": "Hướng dẫn setup environment cho Python Data Science",
                "content": "Để các bạn mới bắt đầu học Python DS dễ dàng hơn, mình chia sẻ cách setup environment với Anaconda và các packages cần thiết.",
                "category": "tutorial",
                "tags": ["python", "data-science", "setup"],
                "is_pinned": True,
                "author_id": str(teachers[1]['_id']) if len(teachers) > 1 else str(teachers[0]['_id']),
                "author_name": teachers[1]['full_name'] if len(teachers) > 1 else teachers[0]['full_name'],
                "author_avatar": teachers[1]['avatar_url'] if len(teachers) > 1 else teachers[0]['avatar_url'],
                "views": 123,
                "replies": 15,
                "created_at": datetime.utcnow() - timedelta(days=5)
            },
            {
                "title": "Thảo luận về career path cho Frontend Developer",
                "content": "Mình đang học frontend và muốn xây dựng career path rõ ràng. Các anh/chị senior có thể tư vấn không ạ?",
                "category": "career",
                "tags": ["career", "frontend", "advice"],
                "is_pinned": False,
                "author_id": str(random.choice(students)['_id']),
                "author_name": random.choice(students)['full_name'],
                "author_avatar": random.choice(students)['avatar_url'],
                "views": 78,
                "replies": 12,
                "created_at": datetime.utcnow() - timedelta(days=1)
            },
            {
                "title": "CSS Grid vs Flexbox - Khi nào dùng cái nào?",
                "content": "Mình thường bị confused khi chọn giữa CSS Grid và Flexbox. Có ai có thể giải thích rõ hơn không?",
                "category": "programming",
                "tags": ["css", "grid", "flexbox", "layout"],
                "is_pinned": False,
                "author_id": str(random.choice(students)['_id']),
                "author_name": random.choice(students)['full_name'],
                "author_avatar": random.choice(students)['avatar_url'],
                "views": 67,
                "replies": 9,
                "created_at": datetime.utcnow() - timedelta(days=3)
            },
            {
                "title": "Chia sẻ resources học UX Design miễn phí",
                "content": "Tổng hợp các tài liệu, khóa học miễn phí chất lượng về UX Design cho người mới bắt đầu.",
                "category": "resources",
                "tags": ["ux-design", "resources", "free"],
                "is_pinned": True,
                "author_id": str(teachers[2]['_id']) if len(teachers) > 2 else str(teachers[0]['_id']),
                "author_name": teachers[2]['full_name'] if len(teachers) > 2 else teachers[0]['full_name'],
                "author_avatar": teachers[2]['avatar_url'] if len(teachers) > 2 else teachers[0]['avatar_url'],
                "views": 156,
                "replies": 23,
                "created_at": datetime.utcnow() - timedelta(days=7)
            },
            {
                "title": "MongoDB vs PostgreSQL cho dự án startup",
                "content": "Dự án startup của team mình đang phân vân chọn database. Ai có kinh nghiệm với cả hai có thể tư vấn không?",
                "category": "programming",
                "tags": ["mongodb", "postgresql", "database", "startup"],
                "is_pinned": False,
                "author_id": str(random.choice(all_users)['_id']),
                "author_name": random.choice(all_users)['full_name'],
                "author_avatar": random.choice(all_users)['avatar_url'],
                "views": 89,
                "replies": 14,
                "created_at": datetime.utcnow() - timedelta(days=4)
            }
        ]
        
        result = await self.database.forum.insert_many(forum_data)
        
        # Store forum topics for reference
        for i, topic_id in enumerate(result.inserted_ids):
            topic_data = forum_data[i].copy()
            topic_data['_id'] = topic_id
            self.forum_topics.append(topic_data)
        
        print(f"✅ Created {len(forum_data)} forum topics!")

    async def generate_all_data(self, clear_existing=True):
        """Generate all sample data"""
        print("🚀 Starting sample data generation...")
        print("=" * 50)
        
        if clear_existing:
            await self.clear_all_data()
        
        # Create data in order (some depend on others)
        await self.create_users()
        await self.create_courses()
        await self.create_assignments()
        await self.create_exams()
        await self.create_webinars()
        await self.create_students()
        await self.create_library_documents()
        await self.create_forum_topics()
        
        print("=" * 50)
        print("🎉 Sample data generation completed!")
        print(f"✅ Users: {len(self.users)}")
        print(f"✅ Courses: {len(self.courses)}")
        print(f"✅ Assignments: {len(self.assignments)}")
        print(f"✅ Exams: {len(self.exams)}")
        print(f"✅ Webinars: {len(self.webinars)}")
        print(f"✅ Students: {len(self.students)}")
        print(f"✅ Library Documents: {len(self.library_docs)}")
        print(f"✅ Forum Topics: {len(self.forum_topics)}")
        print("=" * 50)
        print("🔑 Login credentials:")
        print("   Admin: admin@example.com / admin123")
        print("   Teacher: teacher@example.com / teacher123")
        print("   Student: student1@example.com / student123")
        print("=" * 50)

    async def close_connection(self):
        """Close database connection"""
        self.client.close()

async def main():
    """Main function to run the data generator"""
    generator = SampleDataGenerator()
    
    try:
        await generator.generate_all_data(clear_existing=True)
    except Exception as e:
        print(f"❌ Error generating data: {e}")
    finally:
        await generator.close_connection()

if __name__ == "__main__":
    # Run the data generator
    asyncio.run(main())
