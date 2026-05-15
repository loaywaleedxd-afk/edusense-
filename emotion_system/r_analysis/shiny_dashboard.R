# ============================================================
# EduSense — Professional Analytics Dashboard v3
# ============================================================
# Run:
#   setwd("D:/download/portal/emotion_system")
#   shiny::runApp("r_analysis/shiny_dashboard.R", launch.browser=TRUE)
# ============================================================

suppressPackageStartupMessages({
  library(shiny)
  library(ggplot2)
  library(dplyr)
  library(plotly)
  library(DT)
  library(jsonlite)
  library(shinyjs)
})

`%||%` <- function(a, b) if (!is.null(a) && length(a) > 0) a else b

# ── Load data ─────────────────────────────────────────────
load_data <- function() {
  store_path <- "../gui/store.json"
  if (!file.exists(store_path)) {
    message("store.json not found: ", normalizePath(store_path, mustWork=FALSE))
    return(list(students=data.frame(), attendance=data.frame(),
                courses=data.frame(), photos=list()))
  }
  raw <- tryCatch(fromJSON(store_path, simplifyVector=FALSE), error=function(e) list())

  # Students
  s_list   <- raw$students %||% list()
  students <- if (length(s_list) > 0) {
    do.call(rbind, lapply(s_list, function(s) data.frame(
      id         = s$id          %||% "",
      name       = s$name        %||% "",
      dept       = s$dept        %||% "CS",
      year       = as.integer(s$year %||% 1),
      engagement = as.integer(s$engagement %||% 50),
      attention  = as.integer(s$attention_score %||% 50),
      attendance = as.integer(s$attendance_rate %||% 0),
      gpa        = as.numeric(s$gpa %||% 0),
      emotion    = s$emotion     %||% "neutral",
      present    = as.logical(s$present %||% FALSE),
      email      = s$email       %||% "",
      has_face   = as.logical(s$has_face %||% FALSE),
      stringsAsFactors = FALSE)))
  } else data.frame()

  # Attendance
  att_raw  <- raw$attendance %||% list()
  att_rows <- list()
  for (key in names(att_raw)) {
    recs <- att_raw[[key]]
    if (grepl("_W", key)) {
      parts <- strsplit(key, "_W")[[1]]; course <- parts[1]; week <- as.integer(parts[2])
    } else { course <- key; week <- 0L }
    for (sid in names(recs)) {
      r <- recs[[sid]]
      att_rows[[length(att_rows)+1]] <- data.frame(
        student_id=sid, course_id=course, week=week,
        date=r$date %||% "", time=r$time %||% "",
        method=r$method %||% "manual",
        confidence=as.numeric(r$confidence %||% 1),
        stringsAsFactors=FALSE)
    }
  }
  attendance <- if (length(att_rows)>0) do.call(rbind, att_rows) else
    data.frame(student_id=character(), course_id=character(), week=integer(),
               date=character(), time=character(), method=character(), confidence=numeric())

  # Courses
  c_list  <- raw$courses %||% list()
  courses <- if (length(c_list)>0) {
    do.call(rbind, lapply(c_list, function(c) data.frame(
      id=c$id %||% "", name=c$name %||% "", code=c$code %||% "",
      doctor=c$doctor_name %||% "Unknown", room=c$room %||% "",
      stringsAsFactors=FALSE)))
  } else data.frame()

  # Photo links
  photo_json <- "../student_photo_links.json"
  photos <- if (file.exists(photo_json))
    tryCatch(fromJSON(photo_json), error=function(e) list()) else list()

  list(students=students, attendance=attendance, courses=courses, photos=photos)
}

# ── Palettes ───────────────────────────────────────────────
EMO_COLORS <- c(happy="#10b981",neutral="#6366f1",confused="#8b5cf6",
                bored="#64748b",surprise="#f59e0b",sad="#475569",
                angry="#ef4444",disgust="#dc2626",fear="#f97316")
DEPT_COLORS <- c("#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899")

# ── Theme CSS ──────────────────────────────────────────────
DARK_CSS <- "
:root{--bg:#0a0f1e;--bg2:#0d1526;--card:#131f38;--card2:#182540;
  --sidebar:#080d1a;--border:#1e2d48;--text:#f8fafc;--text2:#94a3b8;--text3:#475569;
  --blue:#3b82f6;--green:#10b981;--purple:#8b5cf6;--amber:#f59e0b;--red:#ef4444;}
body{background:var(--bg) !important;color:var(--text) !important;}
.edui-nav{background:var(--sidebar);border-bottom:1px solid var(--border);}
.edui-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:20px;margin-bottom:16px;}
.edui-card-title{font-size:13px;font-weight:600;color:var(--text2);margin-bottom:14px;}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:22px;position:relative;overflow:hidden;margin-bottom:12px;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.stat-card.blue::before{background:linear-gradient(90deg,#3b82f6,#06b6d4);}
.stat-card.green::before{background:linear-gradient(90deg,#10b981,#34d399);}
.stat-card.purple::before{background:linear-gradient(90deg,#8b5cf6,#ec4899);}
.stat-card.amber::before{background:linear-gradient(90deg,#f59e0b,#ef4444);}
.stat-icon{font-size:26px;margin-bottom:8px;}
.stat-value{font-size:34px;font-weight:700;line-height:1;}
.stat-label{font-size:12px;color:var(--text2);margin-top:5px;}
.stat-sub{font-size:11px;color:var(--text3);margin-top:2px;}
.stu-card{background:var(--card2);border:1px solid var(--border);border-radius:14px;
  padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;transition:.2s;}
.stu-card:hover{border-color:#3b82f6;box-shadow:0 0 0 2px #3b82f618;}
.stu-photo{width:50px;height:50px;border-radius:50%;object-fit:cover;
  border:2px solid var(--border);flex-shrink:0;}
.stu-avatar{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:20px;font-weight:700;flex-shrink:0;color:#fff;}
.stu-name{font-weight:600;color:var(--text);font-size:13px;}
.stu-meta{font-size:11px;color:var(--text2);margin-top:2px;}
.emo-pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.badge-present{background:#052e1a;color:#34d399;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.badge-absent{background:#2d0808;color:#f87171;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.att-bar{height:5px;border-radius:3px;background:#1e2d48;margin-top:6px;}
.att-fill{height:5px;border-radius:3px;}
.nav-btn{background:transparent;border:none;color:var(--text2);padding:8px 14px;
  border-radius:8px;cursor:pointer;font-size:13px;transition:.15s;}
.nav-btn:hover{background:#1e3a6e;color:#60a5fa;}
.nav-btn.active{background:#1e3a6e;color:#60a5fa;font-weight:600;}
.mode-btn{border-radius:20px !important;font-size:12px !important;
  border:1px solid var(--border) !important;background:var(--card2) !important;
  color:var(--text2) !important;height:32px !important;}
table.dataTable{background:var(--card) !important;color:var(--text) !important;}
table.dataTable thead th{background:var(--card2) !important;color:var(--text2) !important;border:none !important;}
table.dataTable tbody tr{background:var(--card) !important;color:var(--text) !important;}
table.dataTable tbody tr:hover td{background:var(--card2) !important;}
table.dataTable tbody tr.odd td{background:var(--bg2) !important;}
.dataTables_wrapper,.dataTables_filter label,.dataTables_length label,
.dataTables_info{color:var(--text2) !important;}
.dataTables_filter input,.dataTables_length select{background:var(--card2) !important;
  color:var(--text) !important;border:1px solid var(--border) !important;border-radius:8px;padding:4px 8px;}
select.form-control,input.form-control{background:var(--card2) !important;
  color:var(--text) !important;border:1px solid var(--border) !important;border-radius:8px !important;}
.selectize-input{background:var(--card2) !important;color:var(--text) !important;
  border:1px solid var(--border) !important;border-radius:8px !important;}
.selectize-dropdown{background:var(--card) !important;color:var(--text) !important;
  border:1px solid var(--border) !important;}
.selectize-dropdown .option:hover{background:var(--card2) !important;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:var(--bg);}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
"

LIGHT_CSS <- "
:root{--bg:#f1f5f9;--bg2:#e8eef6;--card:#ffffff;--card2:#f8fafc;
  --sidebar:#1e293b;--border:#cbd5e1;--text:#0f172a;--text2:#334155;--text3:#64748b;
  --blue:#2563eb;--green:#059669;--purple:#7c3aed;--amber:#d97706;--red:#dc2626;}
body{background:var(--bg) !important;color:var(--text) !important;}
.edui-nav{background:#1e293b;border-bottom:1px solid #334155;}
.edui-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.06);}
.edui-card-title{font-size:13px;font-weight:600;color:var(--text2);margin-bottom:14px;}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:22px;position:relative;overflow:hidden;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.stat-card.blue::before{background:linear-gradient(90deg,#2563eb,#0891b2);}
.stat-card.green::before{background:linear-gradient(90deg,#059669,#10b981);}
.stat-card.purple::before{background:linear-gradient(90deg,#7c3aed,#db2777);}
.stat-card.amber::before{background:linear-gradient(90deg,#d97706,#dc2626);}
.stat-icon{font-size:26px;margin-bottom:8px;}
.stat-value{font-size:34px;font-weight:700;line-height:1;color:var(--text);}
.stat-label{font-size:12px;color:var(--text2);margin-top:5px;}
.stat-sub{font-size:11px;color:var(--text3);margin-top:2px;}
.stu-card{background:var(--card);border:1px solid var(--border);border-radius:14px;
  padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px;
  box-shadow:0 1px 4px rgba(0,0,0,.05);}
.stu-card:hover{border-color:#2563eb;box-shadow:0 0 0 2px #2563eb18;}
.stu-photo{width:50px;height:50px;border-radius:50%;object-fit:cover;
  border:2px solid var(--border);flex-shrink:0;}
.stu-avatar{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:20px;font-weight:700;flex-shrink:0;color:#fff;}
.stu-name{font-weight:600;color:var(--text);font-size:13px;}
.stu-meta{font-size:11px;color:var(--text2);margin-top:2px;}
.emo-pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.badge-present{background:#d1fae5;color:#059669;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.badge-absent{background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;}
.att-bar{height:5px;border-radius:3px;background:#e2e8f0;margin-top:6px;}
.att-fill{height:5px;border-radius:3px;}
.nav-btn{background:transparent;border:none;color:#94a3b8;padding:8px 14px;
  border-radius:8px;cursor:pointer;font-size:13px;transition:.15s;}
.nav-btn:hover{background:#3b82f6;color:#fff;}
.nav-btn.active{background:#3b82f6;color:#fff;font-weight:600;}
.mode-btn{border-radius:20px !important;font-size:12px !important;
  border:1px solid #334155 !important;background:transparent !important;
  color:#94a3b8 !important;height:32px !important;}
table.dataTable{background:var(--card) !important;color:var(--text) !important;}
table.dataTable thead th{background:#f8fafc !important;color:#334155 !important;border:none !important;}
table.dataTable tbody tr td{background:var(--card) !important;color:var(--text) !important;}
table.dataTable tbody tr:hover td{background:#dbeafe !important;}
table.dataTable tbody tr.odd td{background:var(--bg2) !important;}
.dataTables_wrapper,.dataTables_filter label,.dataTables_length label,
.dataTables_info{color:var(--text2) !important;}
.dataTables_filter input,.dataTables_length select{background:#fff !important;
  color:var(--text) !important;border:1px solid var(--border) !important;border-radius:8px;}
select.form-control,input.form-control{background:#fff !important;
  color:var(--text) !important;border:1px solid var(--border) !important;border-radius:8px !important;}
.selectize-input{background:#fff !important;color:var(--text) !important;
  border:1px solid var(--border) !important;border-radius:8px !important;}
.selectize-dropdown{background:#fff !important;color:var(--text) !important;
  border:1px solid var(--border) !important;}
"

BASE_CSS <- "
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{font-family:'Inter','Segoe UI',sans-serif !important;}
.shiny-notification{border-radius:12px !important;}
.btn-primary{background:#3b82f6 !important;border-color:#3b82f6 !important;border-radius:8px !important;}
.row{margin-left:-8px !important;margin-right:-8px !important;}
[class*='col-']{padding-left:8px !important;padding-right:8px !important;}
.page-header{margin-bottom:20px;}
.page-title{font-size:22px;font-weight:700;color:var(--text);}
.page-sub{font-size:12px;color:var(--text2);margin-top:2px;}
"

# ── Helpers ────────────────────────────────────────────────
stat_card_html <- function(icon, value, label, sub="", accent="blue") {
  div(class=paste("stat-card", accent),
      div(class="stat-icon", icon),
      div(class="stat-value",
          style=paste0("color:var(--", accent, ")"), value),
      div(class="stat-label", label),
      if (nchar(sub)>0) div(class="stat-sub", sub)
  )
}

edui_card_wrap <- function(..., title=NULL, icon_txt=NULL) {
  div(class="edui-card",
      if (!is.null(title))
        div(class="edui-card-title",
            if (!is.null(icon_txt)) span(icon_txt, " "),
            title),
      ...)
}

plt_theme <- function(p, mode="dark") {
  bg  <- if(mode=="dark") "#131f38" else "#ffffff"
  txt <- if(mode=="dark") "#94a3b8" else "#334155"
  grd <- if(mode=="dark") "#1e2d48" else "#e2e8f0"
  p %>%
    layout(plot_bgcolor=bg, paper_bgcolor=bg,
           font=list(color=txt, family="Inter, sans-serif", size=12),
           xaxis=list(gridcolor=grd, zerolinecolor=grd),
           yaxis=list(gridcolor=grd, zerolinecolor=grd),
           margin=list(l=40,r=16,t=28,b=40),
           legend=list(bgcolor="rgba(0,0,0,0)", font=list(color=txt))) %>%
    config(displayModeBar=FALSE)
}

gdrive_url <- function(url) {
  if (is.null(url) || url=="" ) return("")
  if (grepl("id=", url)) {
    fid <- gsub(".*id=([^&]+).*", "\\1", url)
    paste0("https://lh3.googleusercontent.com/d/", fid)
  } else url
}

student_card_html <- function(s, photos) {
  sid     <- s$id;    name   <- s$name
  dept    <- s$dept;  yr     <- s$year
  att     <- s$attendance; emo <- s$emotion
  eng     <- s$engagement; gpa <- s$gpa
  present <- isTRUE(s$present)

  photo_link <- photos[[sid]] %||% ""
  img_url    <- if (nchar(photo_link)>0) gdrive_url(photo_link) else ""

  photo_html <- if (nchar(img_url)>0) {
    paste0('<img src="', img_url, '" class="stu-photo" ',
           'onerror="this.outerHTML=\'<div class=&quot;stu-avatar&quot; ',
           'style=&quot;background:#3b82f6&quot;>', substr(name,1,1), '</div>\'" />')
  } else {
    cols <- c("#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899")
    bg   <- cols[(nchar(sid) %% length(cols)) + 1]
    paste0('<div class="stu-avatar" style="background:', bg, '">',
           substr(name, 1, 1), '</div>')
  }

  emo_col <- EMO_COLORS[emo] %||% "#6366f1"
  emo_icon <- c(happy="😊",neutral="😐",confused="😕",bored="😴",
                surprise="😮",sad="😢",angry="😠",fear="😨")[emo] %||% "😐"
  att_col <- if(att>=75) "#10b981" else if(att>=50) "#f59e0b" else "#ef4444"

  badge_html <- if(present)
    '<span class="badge-present">● Present</span>'
  else
    '<span class="badge-absent">○ Absent</span>'

  paste0(
    '<div class="stu-card">',
    photo_html,
    '<div style="flex:1;min-width:0;">',
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">',
    '<span class="stu-name">', htmltools::htmlEscape(name), '</span>',
    badge_html,
    '</div>',
    '<div class="stu-meta">', sid, '  ·  ', dept, '  ·  Yr ', yr, '  ·  GPA ', round(gpa,1), '</div>',
    '<div style="display:flex;gap:8px;margin-top:5px;align-items:center;">',
    '<span class="emo-pill" style="background:', emo_col, '22;color:', emo_col, '">',
    emo_icon, ' ', emo, '</span>',
    '<span style="font-size:11px;color:var(--text3)">Eng: ', eng, '%</span>',
    '</div>',
    '<div class="att-bar"><div class="att-fill" style="width:', min(att,100), '%;background:', att_col, '"></div></div>',
    '</div></div>'
  )
}

# ── UI ─────────────────────────────────────────────────────
ui <- fluidPage(
  useShinyjs(),
  tags$head(
    tags$title("EduSense Analytics"),
    tags$style(id="theme_css", HTML(DARK_CSS)),
    tags$style(HTML(BASE_CSS)),
    tags$script(HTML("
      Shiny.addCustomMessageHandler('setCSS', function(css){
        document.getElementById('theme_css').innerHTML = css;
      });
      function setTab(id) {
        Shiny.setInputValue('active_tab', id, {priority: 'event'});
        document.querySelectorAll('.nav-btn').forEach(function(b){
          b.classList.remove('active');
        });
        var btn = document.getElementById('nbtn_'+id);
        if(btn) btn.classList.add('active');
      }
    "))
  ),

  # Top nav bar
  div(class="edui-nav",
      style="display:flex;align-items:center;justify-content:space-between;
             padding:0 24px;height:60px;position:sticky;top:0;z-index:999;",

    div(style="display:flex;align-items:center;gap:12px;",
      span("⚡", style="font-size:22px;"),
      div(
        div("EduSense", style="font-size:17px;font-weight:700;color:#60a5fa;line-height:1.1;"),
        div("Analytics Dashboard", style="font-size:10px;color:#64748b;")
      )
    ),

    div(style="display:flex;gap:4px;",
      lapply(list(
        list("overview","📊","Overview"),
        list("students","👥","Students"),
        list("attendance","✅","Attendance"),
        list("emotions","😊","Emotions"),
        list("performance","📈","Performance"),
        list("courses","📚","Courses")
      ), function(t) {
        tags$button(id=paste0("nbtn_",t[[1]]),
                    class=paste("nav-btn", if(t[[1]]=="overview") "active" else ""),
                    onclick=paste0("setTab('",t[[1]],"')"),
                    paste(t[[2]], t[[3]]))
      })
    ),

    div(style="display:flex;gap:8px;align-items:center;",
      actionButton("mode_btn","☀️ Light",class="mode-btn btn btn-sm"),
      actionButton("refresh_btn","🔄 Refresh",
                   class="btn btn-primary btn-sm",
                   style="height:32px;border-radius:8px;")
    )
  ),

  # Hidden tab tracker
  tags$input(type="hidden", id="active_tab", value="overview"),

  # Main content
  div(style="padding:24px;",

    # OVERVIEW
    conditionalPanel("input.active_tab == 'overview'",
      div(class="page-header",
          div(class="page-title","📊 Overview"),
          div(class="page-sub","Real-time classroom analytics")),
      fluidRow(
        column(3, uiOutput("ov_s1")), column(3, uiOutput("ov_s2")),
        column(3, uiOutput("ov_s3")), column(3, uiOutput("ov_s4"))
      ),
      br(),
      fluidRow(
        column(8, edui_card_wrap(title="Engagement by Department", icon_txt="📊",
                                  plotlyOutput("p_dept_eng", height=300))),
        column(4, edui_card_wrap(title="Emotion Distribution", icon_txt="😊",
                                  plotlyOutput("p_emo_donut", height=300)))
      ),
      fluidRow(
        column(6, edui_card_wrap(title="Weekly Attendance Trend", icon_txt="📅",
                                  plotlyOutput("p_weekly_att", height=260))),
        column(6, edui_card_wrap(title="GPA Distribution", icon_txt="🎓",
                                  plotlyOutput("p_gpa_hist", height=260)))
      )
    ),

    # STUDENTS
    conditionalPanel("input.active_tab == 'students'",
      div(style="display:flex;align-items:flex-start;justify-content:space-between;
                  flex-wrap:wrap;gap:12px;margin-bottom:20px;",
          div(div(class="page-title","👥 Students"),
              div(class="page-sub","All enrolled students with photos and real-time status")),
          div(style="display:flex;gap:8px;flex-wrap:wrap;",
              selectInput("stu_dept","",choices=c("All Departments"="all"),width="190px"),
              selectInput("stu_year","",
                          choices=c("All Years"="all","Year 1"="1","Year 2"="2",
                                    "Year 3"="3","Year 4"="4"),width="130px"),
              selectInput("stu_present","",
                          choices=c("All Status"="all","Present"="yes","Absent"="no"),
                          width="130px"))
      ),
      fluidRow(
        column(3,uiOutput("stu_s1")),column(3,uiOutput("stu_s2")),
        column(3,uiOutput("stu_s3")),column(3,uiOutput("stu_s4"))
      ),
      br(),
      fluidRow(
        column(8,
          edui_card_wrap(title="Student Directory", icon_txt="👤",
                          div(style="height:620px;overflow-y:auto;padding-right:4px;",
                              uiOutput("student_cards")))
        ),
        column(4,
          edui_card_wrap(title="Emotion Breakdown", icon_txt="😊",
                          plotlyOutput("p_stu_emo", height=230)),
          edui_card_wrap(title="Attendance Distribution", icon_txt="📊",
                          plotlyOutput("p_stu_att", height=200))
        )
      )
    ),

    # ATTENDANCE
    conditionalPanel("input.active_tab == 'attendance'",
      div(class="page-header",
          div(class="page-title","✅ Attendance"),
          div(class="page-sub","Track presence across all courses and weeks")),
      fluidRow(
        column(4, selectInput("att_course","Course:",choices=c("All"="all"),width="100%")),
        column(4, selectInput("att_week","Week:",
                              choices=c("All"="all",setNames(1:16,paste("Week",1:16))),
                              width="100%")),
        column(4, selectInput("att_method","Method:",
                              choices=c("All"="all","Face"="face","Manual"="manual",
                                        "Face Recognition"="face_recognition"),
                              width="100%"))
      ),
      fluidRow(
        column(3,uiOutput("att_s1")),column(3,uiOutput("att_s2")),
        column(3,uiOutput("att_s3")),column(3,uiOutput("att_s4"))
      ),
      br(),
      fluidRow(
        column(6, edui_card_wrap(title="By Week", icon_txt="📅",
                                  plotlyOutput("p_att_week",height=280))),
        column(6, edui_card_wrap(title="By Course", icon_txt="📚",
                                  plotlyOutput("p_att_course",height=280)))
      ),
      edui_card_wrap(title="Attendance Records", icon_txt="📋",
                     DTOutput("tbl_att"))
    ),

    # EMOTIONS
    conditionalPanel("input.active_tab == 'emotions'",
      div(class="page-header",
          div(class="page-title","😊 Emotion Analytics"),
          div(class="page-sub","AI-detected emotions across all sessions")),
      fluidRow(
        column(6, edui_card_wrap(title="Emotion Frequency",icon_txt="📊",
                                  plotlyOutput("p_emo_bar",height=320))),
        column(6, edui_card_wrap(title="Emotion by Department",icon_txt="🏛️",
                                  plotlyOutput("p_emo_dept",height=320)))
      ),
      fluidRow(
        column(6, edui_card_wrap(title="Emotion by Year",icon_txt="📚",
                                  plotlyOutput("p_emo_year",height=260))),
        column(6, edui_card_wrap(title="Attention Levels",icon_txt="👁️",
                                  plotlyOutput("p_attn_pie",height=260)))
      )
    ),

    # PERFORMANCE
    conditionalPanel("input.active_tab == 'performance'",
      div(class="page-header",
          div(class="page-title","📈 Performance"),
          div(class="page-sub","GPA, engagement, and attendance correlations")),
      fluidRow(
        column(6, edui_card_wrap(title="Engagement vs Attention",icon_txt="🧠",
                                  plotlyOutput("p_eng_att",height=320))),
        column(6, edui_card_wrap(title="Attendance vs GPA",icon_txt="📊",
                                  plotlyOutput("p_att_gpa",height=320)))
      ),
      fluidRow(
        column(6, edui_card_wrap(title="GPA by Department",icon_txt="🏛️",
                                  plotlyOutput("p_gpa_dept",height=280))),
        column(6, edui_card_wrap(title="🏆 Top 10 Students by GPA",icon_txt="🏆",
                                  DTOutput("tbl_top")))
      )
    ),

    # COURSES
    conditionalPanel("input.active_tab == 'courses'",
      div(class="page-header",
          div(class="page-title","📚 Courses"),
          div(class="page-sub","Enrollment and attendance per course")),
      fluidRow(
        column(6, edui_card_wrap(title="Students per Course",icon_txt="👥",
                                  plotlyOutput("p_enroll",height=300))),
        column(6, edui_card_wrap(title="Attendance Rate",icon_txt="✅",
                                  plotlyOutput("p_course_rate",height=300)))
      ),
      edui_card_wrap(title="Course Overview",icon_txt="📋",
                     DTOutput("tbl_courses"))
    )
  )
)

# ── Server ──────────────────────────────────────────────────
server <- function(input, output, session) {

  rv   <- reactiveVal(load_data())
  mode <- reactiveVal("dark")

  # Update choices
  observe({
    d <- rv()
    depts <- c("All Departments"="all")
    if (nrow(d$students)>0)
      depts <- c(depts, setNames(sort(unique(d$students$dept)),
                                  sort(unique(d$students$dept))))
    updateSelectInput(session, "stu_dept", choices=depts)

    cc <- c("All"="all")
    if (nrow(d$courses)>0)
      cc <- c(cc, setNames(d$courses$id, paste(d$courses$code,"–",d$courses$name)))
    updateSelectInput(session, "att_course", choices=cc)
  })

  observeEvent(input$refresh_btn, {
    rv(load_data())
    showNotification("✅ Refreshed!", type="message", duration=2)
  })

  observeEvent(input$mode_btn, {
    new <- if(mode()=="dark") "light" else "dark"
    mode(new)
    session$sendCustomMessage("setCSS", if(new=="dark") DARK_CSS else LIGHT_CSS)
    updateActionButton(session,"mode_btn",
                       label=if(new=="dark") "☀️ Light" else "🌙 Dark")
  })

  # ── Overview ─────────────────────────────────────────
  output$ov_s1 <- renderUI({
    stat_card_html("👥", nrow(rv()$students), "Total Students", "Enrolled", "blue")
  })
  output$ov_s2 <- renderUI({
    n <- if(nrow(rv()$students)>0) sum(rv()$students$present,na.rm=TRUE) else 0
    stat_card_html("✅", n, "Present Today",
                   paste0(round(n/max(nrow(rv()$students),1)*100),"% rate"), "green")
  })
  output$ov_s3 <- renderUI({
    avg <- if(nrow(rv()$students)>0) round(mean(rv()$students$engagement,na.rm=TRUE)) else 0
    stat_card_html("🧠", paste0(avg,"%"), "Avg Engagement", "All students", "purple")
  })
  output$ov_s4 <- renderUI({
    stat_card_html("📚", nrow(rv()$courses), "Active Courses", "This semester", "amber")
  })

  output$p_dept_eng <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% group_by(dept) %>%
          summarise(avg=round(mean(engagement,na.rm=TRUE),1), n=n(), .groups="drop") %>%
          arrange(desc(avg))
    nc <- nrow(dd)
    cols <- if(nc>0) colorRampPalette(c("#3b82f6","#8b5cf6","#06b6d4"))(nc) else "#3b82f6"
    plot_ly(dd, x=~reorder(dept,-avg), y=~avg, type="bar",
            marker=list(color=cols),
            text=~paste0(avg,"%"), textposition="outside",
            hovertemplate="%{x}<br>Avg: %{y}%<extra></extra>") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Avg Engagement %", range=c(0,110)),
             bargap=0.3) %>% plt_theme(mode())
  })

  output$p_emo_donut <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% count(emotion) %>% arrange(desc(n))
    cols <- sapply(dd$emotion, function(e) EMO_COLORS[e] %||% "#6366f1")
    plot_ly(dd, labels=~emotion, values=~n, type="pie", hole=0.5,
            marker=list(colors=cols, line=list(color="#0a0f1e",width=2)),
            textinfo="percent") %>% plt_theme(mode())
  })

  output$p_weekly_att <- renderPlotly({
    att <- rv()$attendance
    if(nrow(att)==0||all(att$week==0)) return(plot_ly() %>% layout(title="No attendance data"))
    wk <- att %>% filter(week>0) %>%
          group_by(week) %>% summarise(n=n_distinct(student_id),.groups="drop") %>% arrange(week)
    plot_ly(wk, x=~week, y=~n, type="scatter", mode="lines+markers",
            line=list(color="#10b981",width=3,shape="spline"),
            marker=list(color="#10b981",size=8,line=list(color="white",width=2)),
            fill="tozeroy", fillcolor="rgba(16,185,129,0.1)") %>%
      layout(xaxis=list(title="Week",dtick=2), yaxis=list(title="Students")) %>%
      plt_theme(mode())
  })

  output$p_gpa_hist <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    plot_ly(d$students, x=~gpa, type="histogram", nbinsx=20,
            marker=list(color="#8b5cf6",line=list(color="#a78bfa",width=1))) %>%
      layout(xaxis=list(title="GPA"), yaxis=list(title="Students")) %>% plt_theme(mode())
  })

  # ── Students ─────────────────────────────────────────
  filt_stu <- reactive({
    d <- rv()$students; if(nrow(d)==0) return(d)
    if(!is.null(input$stu_dept)    && input$stu_dept!="all")    d <- d %>% filter(dept==input$stu_dept)
    if(!is.null(input$stu_year)    && input$stu_year!="all")    d <- d %>% filter(year==as.integer(input$stu_year))
    if(!is.null(input$stu_present) && input$stu_present!="all") {
      if(input$stu_present=="yes") d <- d %>% filter(present==TRUE)
      else d <- d %>% filter(present!=TRUE)
    }
    d
  })

  output$stu_s1 <- renderUI({ stat_card_html("👥", nrow(filt_stu()), "Students","Filtered","blue") })
  output$stu_s2 <- renderUI({ stat_card_html("✅", sum(filt_stu()$present,na.rm=TRUE),"Present","Today","green") })
  output$stu_s3 <- renderUI({
    avg <- if(nrow(filt_stu())>0) round(mean(filt_stu()$attendance,na.rm=TRUE)) else 0
    stat_card_html("📊", paste0(avg,"%"),"Avg Attendance","","purple")
  })
  output$stu_s4 <- renderUI({
    avg <- if(nrow(filt_stu())>0) round(mean(filt_stu()$gpa,na.rm=TRUE),2) else 0
    stat_card_html("🎓", avg,"Avg GPA","","amber")
  })

  output$student_cards <- renderUI({
    d <- filt_stu(); photos <- rv()$photos
    if(nrow(d)==0) return(p("No students match filters.",style="color:var(--text3)"))
    limit <- min(nrow(d), 80)
    cards <- lapply(seq_len(limit), function(i) HTML(student_card_html(d[i,], photos)))
    if(nrow(d)>limit)
      cards <- c(cards, list(p(style="color:var(--text3);text-align:center;padding:10px;",
                                paste("Showing",limit,"of",nrow(d),"students. Use filters to narrow down."))))
    do.call(tagList, cards)
  })

  output$p_stu_emo <- renderPlotly({
    d <- filt_stu(); if(nrow(d)==0) return(plot_ly())
    dd <- d %>% count(emotion) %>% arrange(desc(n))
    cols <- sapply(dd$emotion, function(e) EMO_COLORS[e] %||% "#6366f1")
    plot_ly(dd, x=~reorder(emotion,-n), y=~n, type="bar",
            marker=list(color=cols), text=~n, textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Count")) %>% plt_theme(mode())
  })

  output$p_stu_att <- renderPlotly({
    d <- filt_stu(); if(nrow(d)==0) return(plot_ly())
    plot_ly(d, x=~attendance, type="histogram", nbinsx=15,
            marker=list(color="#3b82f6",line=list(color="#60a5fa",width=1))) %>%
      layout(xaxis=list(title="Attendance %"), yaxis=list(title="Students")) %>% plt_theme(mode())
  })

  # ── Attendance ────────────────────────────────────────
  filt_att <- reactive({
    att <- rv()$attendance; if(nrow(att)==0) return(att)
    if(!is.null(input$att_course) && input$att_course!="all") att <- att %>% filter(course_id==input$att_course)
    if(!is.null(input$att_week)   && input$att_week!="all")   att <- att %>% filter(week==as.integer(input$att_week))
    if(!is.null(input$att_method) && input$att_method!="all") att <- att %>% filter(method==input$att_method)
    att
  })

  output$att_s1 <- renderUI({ stat_card_html("👥", nrow(rv()$students),"Total Enrolled","","blue") })
  output$att_s2 <- renderUI({ stat_card_html("✅", length(unique(filt_att()$student_id)),"Present","Filtered","green") })
  output$att_s3 <- renderUI({
    n <- nrow(rv()$students); p <- length(unique(filt_att()$student_id))
    stat_card_html("📊", paste0(if(n>0) round(p/n*100) else 0,"%"),"Attendance Rate","","purple")
  })
  output$att_s4 <- renderUI({
    n <- if(nrow(filt_att())>0) length(unique(paste(filt_att()$course_id,filt_att()$week))) else 0
    stat_card_html("📅", n,"Sessions","Course×Week","amber")
  })

  output$p_att_week <- renderPlotly({
    att <- filt_att()
    if(nrow(att)==0||all(att$week==0)) return(plot_ly())
    wk <- att %>% filter(week>0) %>% group_by(week) %>%
          summarise(n=n_distinct(student_id),.groups="drop") %>% arrange(week)
    plot_ly(wk, x=~week, y=~n, type="bar",
            marker=list(color="#3b82f6"), text=~n, textposition="outside") %>%
      layout(xaxis=list(title="Week",dtick=2), yaxis=list(title="Students")) %>% plt_theme(mode())
  })

  output$p_att_course <- renderPlotly({
    att <- filt_att(); if(nrow(att)==0) return(plot_ly())
    cc <- att %>% group_by(course_id) %>%
          summarise(n=n_distinct(student_id),.groups="drop") %>% arrange(desc(n))
    nc <- nrow(cc)
    cols <- if(nc>0) colorRampPalette(c("#10b981","#06b6d4"))(nc) else "#10b981"
    plot_ly(cc, x=~course_id, y=~n, type="bar",
            marker=list(color=cols), text=~n, textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Students")) %>% plt_theme(mode())
  })

  output$tbl_att <- renderDT({
    att <- filt_att(); d <- rv()
    if(nrow(att)==0) return(datatable(data.frame(Msg="No records"), rownames=FALSE))
    att2 <- att %>%
      left_join(d$students %>% select(id,name), by=c("student_id"="id")) %>%
      mutate(name=ifelse(is.na(name),student_id,name),
             week_lbl=ifelse(week>0,paste("Week",week),"—"),
             conf_pct=paste0(round(confidence*100),"%")) %>%
      select(student_id,name,course_id,week_lbl,date,time,method,conf_pct)
    datatable(att2,
              colnames=c("ID","Name","Course","Week","Date","Time","Method","Conf"),
              options=list(pageLength=15,scrollX=TRUE,dom="frtip"),
              rownames=FALSE, class="compact hover stripe")
  })

  # ── Emotions ──────────────────────────────────────────
  output$p_emo_bar <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% count(emotion) %>%
          mutate(pct=round(n/sum(n)*100,1)) %>% arrange(desc(n))
    cols <- sapply(dd$emotion, function(e) EMO_COLORS[e] %||% "#6366f1")
    plot_ly(dd, x=~reorder(emotion,-n), y=~pct, type="bar",
            marker=list(color=cols), text=~paste0(pct,"%"), textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="% Students")) %>% plt_theme(mode())
  })

  output$p_emo_dept <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% count(dept, emotion)
    plot_ly(dd, x=~dept, y=~n, color=~emotion,
            colors=EMO_COLORS, type="bar") %>%
      layout(barmode="stack", xaxis=list(title=""), yaxis=list(title="Count")) %>%
      plt_theme(mode())
  })

  output$p_emo_year <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% count(year, emotion)
    plot_ly(dd, x=~factor(year), y=~n, color=~emotion,
            colors=EMO_COLORS, type="bar") %>%
      layout(barmode="group", xaxis=list(title="Year"), yaxis=list(title="Count")) %>%
      plt_theme(mode())
  })

  output$p_attn_pie <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- data.frame(
      level=c("High ≥70","Medium 40-69","Low <40"),
      n=c(sum(d$students$attention>=70,na.rm=TRUE),
          sum(d$students$attention>=40 & d$students$attention<70,na.rm=TRUE),
          sum(d$students$attention<40,na.rm=TRUE)),
      col=c("#10b981","#f59e0b","#ef4444"))
    plot_ly(dd, labels=~level, values=~n, type="pie", hole=0.45,
            marker=list(colors=dd$col,line=list(color="#0a0f1e",width=2))) %>%
      plt_theme(mode())
  })

  # ── Performance ───────────────────────────────────────
  output$p_eng_att <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    nc <- length(unique(d$students$dept))
    cols <- if(nc>0) colorRampPalette(DEPT_COLORS)(nc) else "#3b82f6"
    plot_ly(d$students, x=~engagement, y=~attention,
            text=~paste0(name,"<br>",dept,"<br>GPA:",gpa),
            type="scatter", mode="markers",
            color=~dept, colors=cols,
            marker=list(size=9,opacity=0.75,line=list(color="white",width=1))) %>%
      layout(xaxis=list(title="Engagement %"), yaxis=list(title="Attention %")) %>%
      plt_theme(mode())
  })

  output$p_att_gpa <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    plot_ly(d$students, x=~attendance, y=~gpa,
            text=~paste0(name,"<br>",dept),
            type="scatter", mode="markers",
            marker=list(color="#10b981",size=8,opacity=0.7,
                        line=list(color="white",width=1))) %>%
      layout(xaxis=list(title="Attendance %"), yaxis=list(title="GPA")) %>%
      plt_theme(mode())
  })

  output$p_gpa_dept <- renderPlotly({
    d <- rv(); if(nrow(d$students)==0) return(plot_ly())
    dd <- d$students %>% group_by(dept) %>%
          summarise(avg=round(mean(gpa,na.rm=TRUE),2),.groups="drop") %>% arrange(desc(avg))
    plot_ly(dd, x=~reorder(dept,-avg), y=~avg, type="bar",
            marker=list(color="#f59e0b"), text=~avg, textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Avg GPA",range=c(0,4.3))) %>%
      plt_theme(mode())
  })

  output$tbl_top <- renderDT({
    d <- rv(); if(nrow(d$students)==0) return(datatable(data.frame(Msg="No data")))
    top <- d$students %>% arrange(desc(gpa)) %>% head(10) %>%
           select(id,name,dept,year,gpa,engagement,attendance)
    datatable(top, colnames=c("ID","Name","Dept","Yr","GPA","Eng%","Att%"),
              options=list(pageLength=10,dom="t"), rownames=FALSE,
              class="compact hover") %>%
      formatStyle("gpa", background=styleColorBar(c(0,4),"#3b82f6"),
                  backgroundSize="90% 70%", backgroundRepeat="no-repeat",
                  backgroundPosition="center")
  })

  # ── Courses ───────────────────────────────────────────
  output$p_enroll <- renderPlotly({
    att <- rv()$attendance; if(nrow(att)==0) return(plot_ly())
    cc <- att %>% group_by(course_id) %>%
          summarise(n=n_distinct(student_id),.groups="drop") %>% arrange(desc(n))
    plot_ly(cc, x=~course_id, y=~n, type="bar",
            marker=list(color="#f59e0b"), text=~n, textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Unique Students")) %>% plt_theme(mode())
  })

  output$p_course_rate <- renderPlotly({
    d <- rv(); att <- d$attendance; stu <- d$students
    if(nrow(att)==0||nrow(stu)==0) return(plot_ly())
    cc <- att %>% group_by(course_id) %>%
          summarise(p=n_distinct(student_id),.groups="drop") %>%
          mutate(rate=round(p/nrow(stu)*100,1)) %>% arrange(desc(rate))
    plot_ly(cc, x=~course_id, y=~rate, type="bar",
            marker=list(color="#10b981"), text=~paste0(rate,"%"), textposition="outside") %>%
      layout(xaxis=list(title=""), yaxis=list(title="Rate %",range=c(0,110))) %>% plt_theme(mode())
  })

  output$tbl_courses <- renderDT({
    d <- rv(); if(nrow(d$courses)==0) return(datatable(data.frame(Msg="No courses")))
    att_counts <- rv()$attendance %>%
      group_by(course_id) %>%
      summarise(records=n(), students=n_distinct(student_id), .groups="drop") %>%
      rename(id=course_id)
    tbl <- d$courses %>% left_join(att_counts,by="id") %>%
           mutate(records=ifelse(is.na(records),0,records),
                  students=ifelse(is.na(students),0,students))
    datatable(tbl, colnames=c("ID","Name","Code","Doctor","Room","Records","Students"),
              options=list(pageLength=10,dom="t"), rownames=FALSE,
              class="compact hover stripe")
  })
}

shinyApp(ui=ui, server=server)
