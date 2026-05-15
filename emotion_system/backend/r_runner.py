"""
r_runner.py — Add this to your FastAPI backend
Provides endpoints to run R scripts and launch Shiny dashboard
"""

import subprocess
import webbrowser
import threading
import time
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

r_router = APIRouter(prefix="/api/r", tags=["R Analysis"])

BASE_DIR   = Path(__file__).parent
R_DIR      = BASE_DIR / "r_analysis"
DATA_CSV   = BASE_DIR / "data" / "sample_emotion_data.csv"
RESULTS    = BASE_DIR / "results.json"
CHARTS_DIR = BASE_DIR / "charts"
SHINY_PORT = 3001

_shiny_proc = None   # keeps track of the running Shiny process


class RunResult(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None


def run_r(script: Path, args: list = []) -> RunResult:
    """Run any R script synchronously and return its output."""
    if not script.exists():
        return RunResult(success=False, output="", error=f"Script not found: {script}")
    try:
        result = subprocess.run(
            ["Rscript", str(script)] + [str(a) for a in args],
            capture_output=True, text=True, timeout=300, cwd=str(BASE_DIR)
        )
        ok = result.returncode == 0
        return RunResult(success=ok, output=result.stdout,
                         error=result.stderr if not ok else None)
    except FileNotFoundError:
        return RunResult(success=False, output="",
                         error="Rscript not found. Install R and add it to your system PATH.")
    except subprocess.TimeoutExpired:
        return RunResult(success=False, output="", error="Script timed out after 5 minutes.")
    except Exception as e:
        return RunResult(success=False, output="", error=str(e))


# ── Endpoints ───────────────────────────────────────────────

@r_router.get("/check")
def check_r():
    """Check if R is installed."""
    try:
        r = subprocess.run(["Rscript", "--version"], capture_output=True, text=True, timeout=10)
        line = (r.stdout or r.stderr or "").splitlines()[0]
        return {"installed": r.returncode == 0, "version": line}
    except FileNotFoundError:
        return {"installed": False, "version": None}


@r_router.post("/install-packages", response_model=RunResult)
def install_packages():
    """Run install_packages.R"""
    return run_r(R_DIR / "install_packages.R")


@r_router.post("/run-analysis", response_model=RunResult)
def run_analysis():
    """Run analysis.R"""
    CHARTS_DIR.mkdir(exist_ok=True)
    return run_r(R_DIR / "analysis.R", args=[DATA_CSV, RESULTS])


@r_router.post("/launch-shiny", response_model=RunResult)
def launch_shiny():
    """
    Launch the Shiny dashboard using Python subprocess,
    then automatically open it in the browser.
    """
    global _shiny_proc

    script = R_DIR / "shiny_dashboard.R"
    if not script.exists():
        return RunResult(success=False, output="",
                         error=f"shiny_dashboard.R not found at {script}")

    # Kill old process if already running
    if _shiny_proc and _shiny_proc.poll() is None:
        _shiny_proc.terminate()
        time.sleep(1)

    try:
        # Python launches Shiny via subprocess
        _shiny_proc = subprocess.Popen(
            [
                "Rscript", "-e",
                f"shiny::runApp('{script.as_posix()}', port={SHINY_PORT}, launch.browser=FALSE)"
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(BASE_DIR)
        )

        # Open the browser automatically after 3 seconds (waits for Shiny to start)
        def open_browser():
            time.sleep(3)
            webbrowser.open(f"http://localhost:{SHINY_PORT}")

        threading.Thread(target=open_browser, daemon=True).start()

        return RunResult(
            success=True,
            output=(
                f"✅ Shiny dashboard is starting...\n"
                f"🌐 URL: http://localhost:{SHINY_PORT}\n"
                f"🖥️  Browser will open automatically in 3 seconds."
            )
        )

    except FileNotFoundError:
        return RunResult(success=False, output="",
                         error="Rscript not found. Install R and add it to your system PATH.")
    except Exception as e:
        return RunResult(success=False, output="", error=str(e))


@r_router.get("/shiny-status")
def shiny_status():
    """Check if the Shiny process is still alive."""
    if _shiny_proc is None:
        return {"running": False, "url": None}
    running = _shiny_proc.poll() is None
    return {
        "running": running,
        "url": f"http://localhost:{SHINY_PORT}" if running else None
    }


@r_router.post("/stop-shiny")
def stop_shiny():
    """Stop the Shiny dashboard."""
    global _shiny_proc
    if _shiny_proc and _shiny_proc.poll() is None:
        _shiny_proc.terminate()
        return {"stopped": True}
    return {"stopped": False, "message": "Shiny was not running"}
