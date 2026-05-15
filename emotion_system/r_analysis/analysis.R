#!/usr/bin/env Rscript
# ============================================================
# Classroom Emotion Detection & Statistical Analysis System
# Main Analysis Script
# Author: Emotion System v1.0
# ============================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(ggplot2)
  library(tidyr)
  library(jsonlite)
  library(lubridate)
  library(cluster)
  library(factoextra)
})

args <- commandArgs(trailingOnly = TRUE)
csv_path    <- if (length(args) >= 1) args[1] else "emotion_data.csv"
output_path <- if (length(args) >= 2) args[2] else "analysis_results.json"

# ── Load Data ──────────────────────────────────────────────
cat("Loading data from:", csv_path, "\n")
df <- read.csv(csv_path, stringsAsFactors = FALSE)
df$timestamp <- ymd_hms(df$timestamp, quiet = TRUE)

# Engagement weights per emotion
emotion_weights <- c(
  happy    = 1.0, neutral = 0.7, surprise = 0.8,
  confused = 0.45, sad    = 0.2, bored    = 0.1,
  angry    = 0.2, disgust = 0.1, fear     = 0.3
)

# Compute/overwrite engagement score using weights
df <- df %>%
  mutate(
    emotion_lower    = tolower(emotion),
    weight           = emotion_weights[emotion_lower],
    weight           = ifelse(is.na(weight), 0.5, weight),
    engagement_score = round(weight * confidence + (1 - confidence) * 0.3, 3)
  )

cat("Records loaded:", nrow(df), "\n")
cat("Students:      ", n_distinct(df$student_id), "\n")
cat("Lectures:      ", n_distinct(df$lecture_id), "\n")


# ── 1. Emotion Frequency Distribution ─────────────────────
emotion_freq <- df %>%
  count(emotion, name = "count") %>%
  mutate(
    percentage     = round(count / sum(count) * 100, 1),
    avg_confidence = round(tapply(df$confidence, df$emotion, mean)[emotion], 3)
  ) %>%
  arrange(desc(count))

cat("\n── Emotion Distribution ──\n")
print(emotion_freq)


# ── 2. Engagement Score by Lecture ────────────────────────
lecture_engagement <- df %>%
  group_by(lecture_id) %>%
  summarise(
    avg_engagement   = round(mean(engagement_score, na.rm=TRUE)*100, 1),
    avg_attention    = round(mean(attention_score,  na.rm=TRUE)*100, 1),
    sd_engagement    = round(sd(engagement_score,   na.rm=TRUE)*100, 2),
    n_students       = n_distinct(student_id),
    n_records        = n(),
    dominant_emotion = names(which.max(table(emotion))),
    .groups = "drop"
  ) %>%
  arrange(desc(avg_engagement))

cat("\n── Engagement by Lecture ──\n")
print(lecture_engagement)


# ── 3. Student Engagement Summary ─────────────────────────
student_summary <- df %>%
  group_by(student_id) %>%
  summarise(
    avg_engagement   = round(mean(engagement_score, na.rm=TRUE)*100, 1),
    avg_attention    = round(mean(attention_score,  na.rm=TRUE)*100, 1),
    dominant_emotion = names(which.max(table(emotion))),
    lecture_count    = n_distinct(lecture_id),
    n_records        = n(),
    .groups = "drop"
  ) %>%
  arrange(desc(avg_engagement))


# ── 4. Time-Based Emotional Trends ────────────────────────
time_trends <- df %>%
  filter(!is.na(timestamp)) %>%
  mutate(minute = floor_date(timestamp, "5 minutes")) %>%
  group_by(minute, lecture_id) %>%
  summarise(
    avg_engagement = round(mean(engagement_score, na.rm=TRUE)*100, 1),
    avg_attention  = round(mean(attention_score,  na.rm=TRUE)*100, 1),
    dominant_emotion = names(which.max(table(emotion))),
    n_students     = n_distinct(student_id),
    .groups = "drop"
  ) %>%
  arrange(minute)


# ── 5. Emotion Variation Across Lectures ──────────────────
emotion_by_lecture <- df %>%
  group_by(lecture_id, emotion) %>%
  summarise(count = n(), avg_eng = round(mean(engagement_score)*100,1), .groups="drop") %>%
  group_by(lecture_id) %>%
  mutate(pct = round(count/sum(count)*100,1)) %>%
  ungroup()


# ── 6. K-Means Clustering of Students ────────────────────
cluster_results <- list()
if (nrow(student_summary) >= 3) {
  cluster_data <- student_summary %>%
    select(avg_engagement, avg_attention) %>%
    scale()

  set.seed(42)
  k <- min(3, nrow(student_summary))
  km <- kmeans(cluster_data, centers = k, nstart = 25, iter.max = 100)

  student_summary$cluster <- factor(km$cluster, labels = c(
    if(k>=1) "Low Engagement" else NULL,
    if(k>=2) "Moderate Engagement" else NULL,
    if(k>=3) "High Engagement" else NULL
  )[1:k])

  cluster_results <- list(
    cluster_sizes = as.list(table(student_summary$cluster)),
    cluster_centers = lapply(1:k, function(i) list(
      cluster    = i,
      engagement = round(km$centers[i, 1] * sd(student_summary$avg_engagement) +
                           mean(student_summary$avg_engagement), 1),
      attention  = round(km$centers[i, 2] * sd(student_summary$avg_attention) +
                           mean(student_summary$avg_attention), 1)
    )),
    within_ss  = round(km$tot.withinss, 2),
    between_ss = round(km$betweenss, 2)
  )
}


# ── 7. Lecture Clustering (by engagement profile) ────────
lecture_cluster_results <- list()
if (nrow(lecture_engagement) >= 2) {
  lc_data <- lecture_engagement %>% select(avg_engagement, avg_attention) %>% scale()
  k2 <- min(2, nrow(lecture_engagement))
  km2 <- kmeans(lc_data, centers=k2, nstart=10)
  lecture_engagement$cluster <- paste0("Cluster_", km2$cluster)
  lecture_cluster_results <- list(
    assignments = as.list(setNames(km2$cluster, lecture_engagement$lecture_id))
  )
}


# ── 8. Correlation Analysis ───────────────────────────────
correlations <- list()
if (nrow(df) > 5 && !all(is.na(df$engagement_score)) && !all(is.na(df$attention_score))) {
  correlations$eng_att_cor <- round(cor(df$engagement_score, df$attention_score, use="complete.obs"), 3)
  correlations$conf_eng_cor <- round(cor(df$confidence, df$engagement_score, use="complete.obs"), 3)
}


# ── 9. Generate ggplot2 Charts ────────────────────────────
chart_dir <- "charts"
dir.create(chart_dir, showWarnings = FALSE)
charts_generated <- c()

tryCatch({
  # Chart 1: Emotion Distribution
  p1 <- ggplot(emotion_freq, aes(x=reorder(emotion, count), y=count, fill=emotion)) +
    geom_col(show.legend=FALSE, width=0.7) +
    geom_text(aes(label=paste0(percentage,"%")), hjust=-0.1, size=3.5) +
    coord_flip() +
    scale_fill_brewer(palette="Set2") +
    labs(title="Emotion Frequency Distribution",
         subtitle="All lectures combined",
         x="Emotion", y="Count") +
    theme_minimal(base_size=12) +
    theme(plot.title=element_text(face="bold"), panel.grid.major.y=element_blank())
  ggsave(file.path(chart_dir,"emotion_distribution.png"), p1, width=8, height=5, dpi=150)
  charts_generated <- c(charts_generated, "emotion_distribution.png")
}, error=function(e) cat("Chart 1 error:", e$message, "\n"))

tryCatch({
  # Chart 2: Engagement by Lecture
  p2 <- ggplot(lecture_engagement, aes(x=reorder(lecture_id, avg_engagement), y=avg_engagement)) +
    geom_col(fill="#3b82f6", alpha=0.85, width=0.6) +
    geom_errorbar(aes(ymin=avg_engagement-sd_engagement, ymax=avg_engagement+sd_engagement),
                  width=0.2, color="gray50") +
    geom_text(aes(label=paste0(avg_engagement,"%")), hjust=-0.2, size=3.5, fontface="bold") +
    coord_flip() +
    scale_y_continuous(limits=c(0,110)) +
    labs(title="Engagement Score by Lecture",
         subtitle="Error bars show ±1 SD",
         x="Lecture", y="Avg Engagement (%)") +
    theme_minimal(base_size=12) +
    theme(plot.title=element_text(face="bold"))
  ggsave(file.path(chart_dir,"engagement_by_lecture.png"), p2, width=8, height=5, dpi=150)
  charts_generated <- c(charts_generated, "engagement_by_lecture.png")
}, error=function(e) cat("Chart 2 error:", e$message, "\n"))

tryCatch({
  # Chart 3: Emotion over time (heatmap)
  emotion_heatmap <- df %>%
    filter(!is.na(timestamp)) %>%
    mutate(hour = format(timestamp, "%H:00")) %>%
    group_by(hour, emotion) %>% summarise(count=n(), .groups="drop")

  p3 <- ggplot(emotion_heatmap, aes(x=hour, y=emotion, fill=count)) +
    geom_tile(color="white", size=0.3) +
    scale_fill_gradient(low="#e0f2fe", high="#1d4ed8") +
    labs(title="Emotion Heatmap Over Time",
         subtitle="Hourly emotion frequency",
         x="Hour", y="Emotion", fill="Count") +
    theme_minimal(base_size=12) +
    theme(plot.title=element_text(face="bold"),
          axis.text.x=element_text(angle=45, hjust=1))
  ggsave(file.path(chart_dir,"emotion_heatmap.png"), p3, width=9, height=5, dpi=150)
  charts_generated <- c(charts_generated, "emotion_heatmap.png")
}, error=function(e) cat("Chart 3 error:", e$message, "\n"))

tryCatch({
  # Chart 4: Student cluster scatter plot
  if (nrow(student_summary) >= 3 && "cluster" %in% names(student_summary)) {
    p4 <- ggplot(student_summary, aes(x=avg_engagement, y=avg_attention, color=cluster)) +
      geom_point(size=4, alpha=0.8) +
      geom_text(aes(label=student_id), vjust=-1, size=3) +
      scale_color_brewer(palette="Set1") +
      labs(title="Student Engagement Clusters",
           subtitle="K-means clustering (k=3)",
           x="Avg Engagement (%)", y="Avg Attention (%)", color="Cluster") +
      theme_minimal(base_size=12) +
      theme(plot.title=element_text(face="bold"))
    ggsave(file.path(chart_dir,"student_clusters.png"), p4, width=8, height=6, dpi=150)
    charts_generated <- c(charts_generated, "student_clusters.png")
  }
}, error=function(e) cat("Chart 4 error:", e$message, "\n"))

tryCatch({
  # Chart 5: Emotion stacked bar by lecture
  p5 <- ggplot(emotion_by_lecture, aes(x=lecture_id, y=pct, fill=emotion)) +
    geom_col(position="stack", width=0.7) +
    scale_fill_brewer(palette="Set2") +
    labs(title="Emotion Distribution by Lecture",
         x="Lecture", y="Percentage (%)", fill="Emotion") +
    theme_minimal(base_size=12) +
    theme(plot.title=element_text(face="bold"))
  ggsave(file.path(chart_dir,"emotion_by_lecture.png"), p5, width=8, height=5, dpi=150)
  charts_generated <- c(charts_generated, "emotion_by_lecture.png")
}, error=function(e) cat("Chart 5 error:", e$message, "\n"))


# ── Compile Results ──────────────────────────────────────
results <- list(
  summary = list(
    total_records   = nrow(df),
    total_students  = n_distinct(df$student_id),
    total_lectures  = n_distinct(df$lecture_id),
    overall_avg_eng = round(mean(df$engagement_score, na.rm=TRUE)*100, 1),
    overall_avg_att = round(mean(df$attention_score,  na.rm=TRUE)*100, 1)
  ),
  emotion_distribution   = emotion_freq,
  lecture_engagement     = lecture_engagement,
  student_summary        = student_summary,
  time_trends            = time_trends,
  emotion_by_lecture     = emotion_by_lecture,
  student_clusters       = cluster_results,
  lecture_clusters       = lecture_cluster_results,
  correlations           = correlations,
  charts_generated       = charts_generated,
  generated_at           = as.character(Sys.time())
)

# Write JSON output
write_json(results, output_path, pretty=TRUE, auto_unbox=TRUE)
cat("\n✅ Analysis complete. Results written to:", output_path, "\n")
cat("📊 Charts generated:", length(charts_generated), "\n")
