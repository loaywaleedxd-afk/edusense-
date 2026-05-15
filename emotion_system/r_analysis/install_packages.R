#!/usr/bin/env Rscript
# install_packages.R — Run this ONCE before starting the R dashboard
pkgs <- c("dplyr","ggplot2","tidyr","jsonlite","lubridate",
          "cluster","factoextra","shiny","shinydashboard",
          "plotly","DT","httr")
new  <- pkgs[!(pkgs %in% installed.packages()[,"Package"])]
if(length(new)) install.packages(new, repos="https://cloud.r-project.org")
cat("✅ All R packages ready\n")
