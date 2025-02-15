export const testData = {
  // Student Registration
  studentRegistration: {
    fullName: "John Doe",
    fatherName: "Michael Doe",
    motherName: "Sarah Doe",
    emailAddress: "john.doe@example.com",
    phoneNumber: "9876543210",
    dateOfBirth: "1995-05-15",
    aadharNumber: "123456789012",
    selectedCourse: "MERN FullStack",
    courseDuration: "6 months",
    address: "123 Main Street, City",
    qualification: "Graduated",
    password: "securepass123"
  },

  // Student Login
  studentLogin: {
    emailAddress: "john.doe@example.com",
    password: "securepass123"
  },

  // Admin Registration
  adminRegistration: {
    email: "admin@skillup.com",
    password: "admin123",
    role: "admin"
  },

  // Admin Login
  adminLogin: {
    email: "admin@skillup.com",
    password: "admin123"
  },

  // Review
  review: {
    name: "Jane Smith",
    comment: "Excellent course content and teaching methodology!",
    rating: 5
  }
};

export const apiEndpoints = {
  // Student APIs
  student: {
    register: "POST /api/students/register",
    login: "POST /api/students/login"
  },
  
  // Admin APIs
  admin: {
    register: "POST /api/admin/register",
    login: "POST /api/admin/login",
    profile: "GET /api/admin/profile",
    dashboard: "GET /api/admin/dashboard"
  },
  
  // Review APIs
  reviews: {
    create: "POST /api/reviews",
    getAll: "GET /api/reviews"
  }
};

// Example cURL commands for testing
export const curlCommands = `
# Student Registration
curl -X POST http://localhost:5000/api/students/register \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData.studentRegistration)}'

# Student Login
curl -X POST http://localhost:5000/api/students/login \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData.studentLogin)}'

# Admin Registration
curl -X POST http://localhost:5000/api/admin/register \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData.adminRegistration)}'

# Admin Login
curl -X POST http://localhost:5000/api/admin/login \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData.adminLogin)}'

# Create Review
curl -X POST http://localhost:5000/api/reviews \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData.review)}'

# Get All Reviews
curl http://localhost:5000/api/reviews
`; 