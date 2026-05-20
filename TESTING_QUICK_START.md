# Quick Test Runner Guide

## 🚀 Start Testing Session

Run this command to start a comprehensive test session:

```bash
python run_tests.py --all --verbose
```

## 📋 Available Test Files

### Unit Tests
- **test_data_store.py** - DataStore functionality
  - Student initialization and validation
  - Doctor data management
  - Lecture setup
  - User authentication
  - Data persistence

- **test_emotion_engine.py** - Emotion detection engine
  - Engine initialization
  - Emotion weight mappings
  - Frame decoding
  - State management
  - Input validation

### Database Tests
- **test_database.py** - Database operations
  - Table creation and schema
  - Data insertion and retrieval
  - Constraint validation
  - Integrity checks

### API Tests  
- **test_api.py** - REST API endpoints
  - Health check
  - Authentication (login, register)
  - Student endpoints
  - Attendance tracking
  - Emotion recording
  - Lecture management
  - Analytics

### Integration Tests
- **test_integration.py** - Component interaction
  - DataStore + EmotionEngine
  - Attendance + Emotion workflow
  - Data consistency validation
  - Role-based access
  - User authentication flow
  - Complete emotion analysis workflow

## ⚡ Quick Commands

```bash
# Install dependencies first
pip install -r tests/requirements-test.txt

# Run all tests
python run_tests.py --all

# Run with verbose output
python run_tests.py --all --verbose

# Run specific test type
python run_tests.py --unit        # Unit tests only
python run_tests.py --integration # Integration tests only
python run_tests.py --api         # API tests only
python run_tests.py --database    # Database tests only

# Run with coverage
python run_tests.py --coverage

# Run in parallel
python run_tests.py --parallel

# Run specific file
python run_tests.py --file test_data_store.py

# List all tests
python run_tests.py --list

# Show full help
python run_tests.py --help-full
```

## 📊 Test Reports

After running tests, view the generated reports:
- **tests/reports/all_tests_report.html** - Full test report
- **tests/reports/unit_tests_report.html** - Unit test report
- **tests/reports/integration_tests_report.html** - Integration test report
- **tests/reports/api_tests_report.html** - API test report
- **tests/reports/database_tests_report.html** - Database test report
- **tests/reports/coverage/** - Code coverage report

## 🎯 Test Coverage Areas

### Data Management (Unit)
- 8 test classes covering DataStore
- 40+ individual test cases
- Student, doctor, lecture, user management

### Emotion Engine (Unit)
- 5 test classes for EmotionEngine
- 25+ test cases
- Emotion categorization and analysis

### Database Operations (Database)
- 4 test classes for DB operations
- 12+ test cases
- CRUD operations, constraints, schema

### API Endpoints (API)
- 7 test classes for API endpoints
- 30+ test cases
- All major REST endpoints tested

### System Integration (Integration)
- 5 test classes for integration scenarios
- 25+ test cases
- Component interaction and data flow

## 💡 Tips

1. **First time?** Run: `python run_tests.py --all --verbose`
2. **Development?** Run: `python run_tests.py --unit`
3. **Before commit?** Run: `python run_tests.py --all`
4. **Performance check?** Run: `python run_tests.py --parallel`
5. **Code quality?** Run: `python run_tests.py --coverage`

## ✅ Success Indicators

After running tests, you should see:
- ✅ All tests passed
- ✅ No errors or failures
- ✅ HTML reports generated in tests/reports/
- ✅ Coverage report (if using --coverage)

## 🔗 Related Files

- **tests/conftest.py** - Pytest fixtures and configuration
- **tests/requirements-test.txt** - Test dependencies
- **tests/README.md** - Detailed testing guide
- **pytest.ini** - Pytest global configuration
- **run_tests.py** - Test runner script

---

**For more information, see:** tests/README.md
