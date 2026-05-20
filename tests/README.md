# EduSense Emotion System - Testing Guide

This directory contains comprehensive automated tests for the EduSense Emotion Detection & Attendance System.

## 📋 Table of Contents

- [Test Structure](#test-structure)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)

## 🏗️ Test Structure

```
tests/
├── __init__.py                  # Test package initialization
├── conftest.py                  # Pytest configuration and fixtures
├── test_data_store.py          # Unit tests for DataStore
├── test_emotion_engine.py       # Unit tests for EmotionEngine
├── test_database.py            # Database operation tests
├── test_api.py                 # API endpoint tests
├── test_integration.py         # Integration tests
├── requirements-test.txt       # Testing dependencies
└── reports/                    # Generated test reports (HTML, coverage)
```

## 🔧 Installation

### 1. Install Testing Dependencies

```bash
# Navigate to workspace root
cd d:\download\portal

# Install test requirements
pip install -r tests/requirements-test.txt
```

Or install individually:

```bash
pip install pytest pytest-asyncio pytest-cov pytest-html pytest-xdist aiosqlite httpx
```

### 2. Verify Installation

```bash
pytest --version
python run_tests.py --list
```

## 🚀 Running Tests

### Quick Start

Run all tests with a simple command:

```bash
python run_tests.py --all
```

### Using the Test Runner

The `run_tests.py` script provides convenient shortcuts for different testing scenarios:

#### Run All Tests
```bash
python run_tests.py --all
```

#### Run Specific Test Type
```bash
# Unit tests only
python run_tests.py --unit

# Integration tests only
python run_tests.py --integration

# API tests only
python run_tests.py --api

# Database tests only
python run_tests.py --database
```

#### Run with Verbose Output
```bash
python run_tests.py --all --verbose
```

#### Run Specific Test File
```bash
python run_tests.py --file test_data_store.py
```

#### Run with Coverage Report
```bash
python run_tests.py --coverage
```

#### Run Tests in Parallel
```bash
python run_tests.py --parallel
```

### Using pytest Directly

You can also use pytest directly for more control:

```bash
# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run specific test file
pytest tests/test_data_store.py

# Run specific test class
pytest tests/test_data_store.py::TestDataStoreInitialization

# Run with markers
pytest tests/ -m unit
pytest tests/ -m integration
pytest tests/ -m api
pytest tests/ -m database

# Run with coverage
pytest tests/ --cov=emotion_system --cov-report=html

# Run with output file
pytest tests/ -v --tb=short > test_results.txt

# Run in parallel
pytest tests/ -n auto

# Run with multiple options
pytest tests/ -v --tb=short --cov=emotion_system -m "unit or integration"
```

## 📊 Test Types

### Unit Tests (`-m unit`)
Test individual components in isolation:
- **test_data_store.py**: DataStore initialization, student/doctor data, user management
- **test_emotion_engine.py**: Emotion weights, frame decoding, state management

Run unit tests:
```bash
python run_tests.py --unit
pytest tests/ -m unit -v
```

### Integration Tests (`-m integration`)
Test components working together:
- DataStore + EmotionEngine interaction
- Attendance + Emotion workflow
- Data consistency across modules
- Role-based access validation

Run integration tests:
```bash
python run_tests.py --integration
pytest tests/ -m integration -v
```

### API Tests (`-m api`)
Test API endpoints and responses:
- Health check endpoint
- Authentication (login, register)
- Student endpoints
- Attendance tracking
- Emotion recording
- Lecture management
- Analytics endpoints

Run API tests:
```bash
python run_tests.py --api
pytest tests/ -m api -v
```

### Database Tests (`-m database`)
Test database operations:
- Table creation and schema
- Data insertion and retrieval
- Constraints validation
- Integrity checks

Run database tests:
```bash
python run_tests.py --database
pytest tests/ -m database -v
```

## 📈 Test Coverage

### Generate Coverage Report

```bash
# Terminal coverage report
pytest tests/ --cov=emotion_system --cov-report=term-missing

# HTML coverage report
python run_tests.py --coverage

# Coverage report with specific modules
pytest tests/ --cov=emotion_system.gui --cov=emotion_system.backend --cov-report=html
```

View coverage report:
- Open `tests/reports/coverage/index.html` in a browser

### Coverage Goals

- **Target**: 80%+ code coverage
- **Critical modules**: Backend (100%), GUI core (80%)
- **View report**: `coverage/index.html`

## 🔄 Continuous Integration

### GitHub Actions Example

Create `.github/workflows/tests.yml`:

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r tests/requirements-test.txt
    
    - name: Run tests
      run: pytest tests/ -v --cov=emotion_system --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

## ✅ Best Practices

### Writing Tests

1. **Use descriptive names**:
   ```python
   # Good
   def test_datastore_initializes_with_students()
   
   # Bad
   def test_init()
   ```

2. **Use fixtures**:
   ```python
   def test_with_sample_data(sample_emotion_data):
       assert sample_emotion_data['emotion'] == 'happy'
   ```

3. **Test one thing per test**:
   ```python
   # Good - single assertion
   def test_student_id_format():
       store = DataStore()
       assert store.students[0]['id'].startswith('S')
   
   # Avoid - multiple assertions
   def test_everything():
       assert x and y and z
   ```

4. **Mark tests appropriately**:
   ```python
   @pytest.mark.unit
   def test_something():
       pass
   
   @pytest.mark.integration
   def test_something_else():
       pass
   ```

### Running Tests Effectively

1. **Run unit tests during development**:
   ```bash
   pytest tests/test_data_store.py -v
   ```

2. **Before committing, run all tests**:
   ```bash
   pytest tests/ -v
   ```

3. **Check coverage regularly**:
   ```bash
   pytest tests/ --cov=emotion_system --cov-report=term-missing
   ```

4. **Run specific failing tests**:
   ```bash
   pytest tests/test_data_store.py::TestDataStoreInitialization::test_students_are_initialized -v
   ```

## 📝 Common Commands Quick Reference

```bash
# Session starting test command
python run_tests.py --all --verbose

# Development testing
pytest tests/test_data_store.py -v --tb=short

# Full CI/CD pipeline
pytest tests/ -v --cov=emotion_system --cov-report=html --cov-report=term

# Quick smoke test
pytest tests/ -x  # Stop on first failure

# Run and watch
pytest tests/ -v --looponfail

# Generate JSON report
pytest tests/ -v --json-report --json-report-file=report.json
```

## 🐛 Troubleshooting

### Import Errors

If you get import errors:
```bash
# Ensure you're in the right directory
cd d:\download\portal

# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -name "*.pyc" -delete
```

### Async Test Issues

For async/await test issues:
```bash
# Install pytest-asyncio
pip install pytest-asyncio

# Mark test file
# Add to conftest.py: pytest_plugins = ('pytest_asyncio',)
```

### Database Locking

For database test issues:
```bash
# Use temporary directories for test databases
# Already handled in conftest.py with tmp_path fixture
```

## 📚 Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [AsyncIO Testing](https://docs.pytest.org/en/stable/how-to-use-asyncio.html)
- [Coverage.py](https://coverage.readthedocs.io/)

## 🎯 Test Session Starting Command

To start a comprehensive test session with all testing types:

```bash
python run_tests.py --all --verbose
```

This will:
1. ✅ Run all unit tests
2. ✅ Run all integration tests  
3. ✅ Run all API tests
4. ✅ Run all database tests
5. 📊 Generate HTML reports in `tests/reports/`
6. 🔍 Show detailed output with verbose logging

---

**Created**: 2026-05-16
**Updated**: 2026-05-16
**Testing Framework**: Pytest
**Async Support**: Yes (pytest-asyncio)
