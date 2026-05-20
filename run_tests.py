"""
Test Runner Script
Comprehensive test execution with various options and reporting
"""
import subprocess
import sys
import os
import argparse
from datetime import datetime
from pathlib import Path


class TestRunner:
    """Main test runner class."""
    
    def __init__(self, workspace_root):
        self.workspace_root = workspace_root
        self.tests_dir = os.path.join(workspace_root, "tests")
        self.report_dir = os.path.join(self.tests_dir, "reports")
        
        # Create reports directory if it doesn't exist
        os.makedirs(self.report_dir, exist_ok=True)
    
    def generate_report_filename(self, test_type):
        """Generate a report filename with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{test_type}_report_{timestamp}.html"
    
    def run_all_tests(self, verbose=False):
        """Run all tests."""
        print("\n" + "="*60)
        print("🚀 RUNNING ALL TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'all_tests_report.html')}",
            "--self-contained-html",
            "-m", "not slow"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_unit_tests(self, verbose=False):
        """Run only unit tests."""
        print("\n" + "="*60)
        print("🧪 RUNNING UNIT TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-m", "unit",
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'unit_tests_report.html')}",
            "--self-contained-html"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_integration_tests(self, verbose=False):
        """Run only integration tests."""
        print("\n" + "="*60)
        print("🔗 RUNNING INTEGRATION TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-m", "integration",
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'integration_tests_report.html')}",
            "--self-contained-html"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_api_tests(self, verbose=False):
        """Run only API tests."""
        print("\n" + "="*60)
        print("📡 RUNNING API TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-m", "api",
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'api_tests_report.html')}",
            "--self-contained-html"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_database_tests(self, verbose=False):
        """Run only database tests."""
        print("\n" + "="*60)
        print("💾 RUNNING DATABASE TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-m", "database",
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'database_tests_report.html')}",
            "--self-contained-html"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_tests_with_coverage(self, verbose=False):
        """Run tests with coverage reporting."""
        print("\n" + "="*60)
        print("📊 RUNNING TESTS WITH COVERAGE")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-v" if verbose else "-q",
            "--cov=emotion_system",
            "--cov-report=html:" + os.path.join(self.report_dir, "coverage"),
            "--cov-report=term-missing",
            "--tb=short"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_specific_test_file(self, test_file, verbose=False):
        """Run a specific test file."""
        print(f"\n{'='*60}")
        print(f"🎯 RUNNING {test_file}")
        print("="*60)
        
        test_path = os.path.join(self.tests_dir, test_file)
        
        cmd = [
            sys.executable, "-m", "pytest",
            test_path,
            "-v" if verbose else "-q",
            "--tb=short"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def run_parallel_tests(self, verbose=False):
        """Run tests in parallel using pytest-xdist."""
        print("\n" + "="*60)
        print("⚡ RUNNING TESTS IN PARALLEL")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "-n", "auto",  # Auto-detect number of CPUs
            "-v" if verbose else "-q",
            "--tb=short",
            f"--html={os.path.join(self.report_dir, 'parallel_tests_report.html')}",
            "--self-contained-html"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def list_tests(self):
        """List all available tests."""
        print("\n" + "="*60)
        print("📝 AVAILABLE TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, "-m", "pytest",
            self.tests_dir,
            "--collect-only",
            "-q"
        ]
        
        return subprocess.run(cmd, cwd=self.workspace_root)
    
    def print_help(self):
        """Print help information."""
        help_text = """
╔═══════════════════════════════════════════════════════════════════╗
║            EduSense Emotion System - TEST RUNNER                  ║
╚═══════════════════════════════════════════════════════════════════╝

USAGE EXAMPLES:
───────────────

1. Run all tests:
   python run_tests.py --all

2. Run only unit tests:
   python run_tests.py --unit

3. Run only integration tests:
   python run_tests.py --integration

4. Run only API tests:
   python run_tests.py --api

5. Run only database tests:
   python run_tests.py --database

6. Run tests with coverage report:
   python run_tests.py --coverage

7. Run tests in parallel:
   python run_tests.py --parallel

8. Run with verbose output:
   python run_tests.py --all --verbose

9. List all available tests:
   python run_tests.py --list

10. Run a specific test file:
    python run_tests.py --file test_data_store.py

TEST TYPES:
───────────
• unit        : Unit tests for individual components
• integration : Integration tests for component interaction
• api         : API endpoint tests
• database    : Database operation tests

OUTPUT:
───────
• HTML reports are generated in: tests/reports/
• Coverage reports (if --coverage used): tests/reports/coverage/

ABBREVIATIONS:
──────────────
-u, --unit         : Run unit tests
-i, --integration  : Run integration tests
-a, --api          : Run API tests
-d, --database     : Run database tests
-c, --coverage     : Run with coverage reporting
-p, --parallel     : Run tests in parallel
-v, --verbose      : Verbose output
-f, --file         : Run specific test file
-l, --list         : List all tests
--all              : Run all tests

INSTALLING DEPENDENCIES:
────────────────────────
Before running tests, install required packages:

pip install pytest pytest-asyncio pytest-cov pytest-html pytest-xdist

For async database tests:
pip install aiosqlite

For API tests with FastAPI:
pip install httpx starlette

EXAMPLE COMMAND SEQUENCE:
──────────────────────────
1. pytest tests/ -v
2. pytest tests/ -m unit --tb=short
3. pytest tests/ --cov=emotion_system --cov-report=html
        """
        print(help_text)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="EduSense Emotion System Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--all', action='store_true', help='Run all tests')
    parser.add_argument('-u', '--unit', action='store_true', help='Run unit tests')
    parser.add_argument('-i', '--integration', action='store_true', help='Run integration tests')
    parser.add_argument('-a', '--api', action='store_true', help='Run API tests')
    parser.add_argument('-d', '--database', action='store_true', help='Run database tests')
    parser.add_argument('-c', '--coverage', action='store_true', help='Run with coverage')
    parser.add_argument('-p', '--parallel', action='store_true', help='Run in parallel')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-f', '--file', help='Run specific test file')
    parser.add_argument('-l', '--list', action='store_true', help='List all tests')
    parser.add_argument('--help-full', action='store_true', help='Show full help')
    
    args = parser.parse_args()
    
    # Get workspace root
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    runner = TestRunner(workspace_root)
    
    # If no arguments, show help
    if not any(vars(args).values()):
        runner.print_help()
        return 0
    
    # Show full help
    if args.help_full:
        runner.print_help()
        return 0
    
    # Run appropriate tests
    result = None
    
    if args.list:
        result = runner.list_tests()
    elif args.file:
        result = runner.run_specific_test_file(args.file, args.verbose)
    elif args.coverage:
        result = runner.run_tests_with_coverage(args.verbose)
    elif args.parallel:
        result = runner.run_parallel_tests(args.verbose)
    elif args.unit:
        result = runner.run_unit_tests(args.verbose)
    elif args.integration:
        result = runner.run_integration_tests(args.verbose)
    elif args.api:
        result = runner.run_api_tests(args.verbose)
    elif args.database:
        result = runner.run_database_tests(args.verbose)
    elif args.all:
        result = runner.run_all_tests(args.verbose)
    
    if result:
        print("\n" + "="*60)
        print(f"Test run completed with exit code: {result.returncode}")
        print("="*60 + "\n")
        return result.returncode
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
