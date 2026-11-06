# Packages the compiled TypeScript backend application for deployment.
# For production environments, pre-bundle dependencies or use container images.
data "archive_file" "backend_package" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend/dist"
  output_path = "${path.module}/.terraform/builds/weatherly_backend.zip"
}
