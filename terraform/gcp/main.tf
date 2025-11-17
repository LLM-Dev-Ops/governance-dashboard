# ========================================
# GCP Infrastructure for LLM Governance
# ========================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "gcs" {
    bucket = "llm-governance-terraform-state"
    prefix = "production/state"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# VPC Network
resource "google_compute_network" "main" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
}

# Subnet for GKE
resource "google_compute_subnetwork" "gke" {
  name          = "${var.project_name}-gke-subnet"
  ip_cidr_range = var.gke_subnet_cidr
  region        = var.gcp_region
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.gke_pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.gke_services_cidr
  }
}

# GKE Cluster
resource "google_container_cluster" "main" {
  name     = "${var.project_name}-gke"
  location = var.gcp_region

  # We can't create a cluster with no node pool, so we create the smallest possible default node pool and immediately delete it
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }

  network_policy {
    enabled = true
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }
}

# Node Pool
resource "google_container_node_pool" "primary" {
  name       = "${var.project_name}-node-pool"
  location   = var.gcp_region
  cluster    = google_container_cluster.main.name
  node_count = 3

  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }

  node_config {
    preemptible  = false
    machine_type = "n2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-standard"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      environment = var.environment
      project     = var.project_name
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Cloud SQL PostgreSQL
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-postgres"
  database_version = "POSTGRES_16"
  region           = var.gcp_region

  deletion_protection = true

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    database_flags {
      name  = "shared_preload_libraries"
      value = "timescaledb"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
    }
  }
}

resource "google_sql_database" "main" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "main" {
  name     = var.db_username
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# Cloud Memorystore for Redis
resource "google_redis_instance" "main" {
  name               = "${var.project_name}-redis"
  tier               = "STANDARD_HA"
  memory_size_gb     = 5
  region             = var.gcp_region
  authorized_network = google_compute_network.main.id

  redis_version     = "REDIS_7_0"
  display_name      = "${var.project_name} Redis"

  transit_encryption_mode = "SERVER_AUTHENTICATION"
  auth_enabled           = true

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
}

# GCS Bucket for backups
resource "google_storage_bucket" "backups" {
  name          = "${var.project_name}-backups-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# Outputs
output "gke_cluster_name" {
  value = google_container_cluster.main.name
}

output "gke_cluster_endpoint" {
  value     = google_container_cluster.main.endpoint
  sensitive = true
}

output "postgres_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "postgres_private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}

output "redis_host" {
  value = google_redis_instance.main.host
}

output "redis_port" {
  value = google_redis_instance.main.port
}
