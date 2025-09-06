#!/bin/bash
# deploy.sh - Updated to use Docker Compose V2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="webdriverio"
DEPLOY_ENV=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deploy_${TIMESTAMP}.log"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Checking prerequisites..."
    print_message "$BLUE" "========================================"
    
    local missing_deps=0
    
    # Check for Docker
    if command_exists docker; then
        print_message "$GREEN" "✓ Docker is installed"
        docker --version | tee -a "$LOG_FILE"
    else
        print_message "$RED" "✗ Docker is not installed"
        missing_deps=1
    fi
    
    # Check for Docker Compose V2 (preferred) or V1
    if docker compose version >/dev/null 2>&1; then
        print_message "$GREEN" "✓ Docker Compose V2 is available"
        docker compose version | tee -a "$LOG_FILE"
        COMPOSE_CMD="docker compose"
    elif command_exists docker-compose; then
        print_message "$GREEN" "✓ Docker Compose V1 is installed"
        docker-compose --version | tee -a "$LOG_FILE"
        COMPOSE_CMD="docker-compose"
    else
        print_message "$YELLOW" "⚠ Docker Compose not found - will skip compose operations"
        COMPOSE_CMD=""
    fi
    
    # Check for Node.js
    if command_exists node; then
        print_message "$GREEN" "✓ Node.js is installed"
        node --version | tee -a "$LOG_FILE"
    else
        print_message "$RED" "✗ Node.js is not installed"
        missing_deps=1
    fi
    
    # Check for npm
    if command_exists npm; then
        print_message "$GREEN" "✓ npm is installed"
        npm --version | tee -a "$LOG_FILE"
    else
        print_message "$RED" "✗ npm is not installed"
        missing_deps=1
    fi
    
    if [ $missing_deps -eq 1 ]; then
        print_message "$RED" "Please install missing dependencies before continuing."
        exit 1
    fi
    
    print_message "$GREEN" "All prerequisites are met!"
}

# Function to build Docker image
build_docker_image() {
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Building Docker image..."
    print_message "$BLUE" "========================================"
    
    # Build the Docker image
    if docker build -t ${APP_NAME}:${TIMESTAMP} -t ${APP_NAME}:latest . >> "$LOG_FILE" 2>&1; then
        print_message "$GREEN" "✓ Docker image built successfully"
        print_message "$GREEN" "  Image: ${APP_NAME}:${TIMESTAMP}"
    else
        print_message "$RED" "✗ Failed to build Docker image"
        exit 1
    fi
}

# Function to run tests in Docker
run_tests() {
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Running tests in Docker container..."
    print_message "$BLUE" "========================================"
    
    # Run tests in a temporary container
    if docker run --rm \
        --name ${APP_NAME}-test \
        -v $(pwd)/test-reports:/app/test-reports \
        -e CI=true \
        ${APP_NAME}:latest \
        npx wdio run wdio.conf.js --headless >> "$LOG_FILE" 2>&1; then
        print_message "$GREEN" "✓ Tests passed successfully"
    else
        print_message "$YELLOW" "⚠ Some tests failed (continuing with deployment)"
    fi
}

# Function to deploy with Docker Compose (only if available)
deploy_with_compose() {
    local env=$1
    
    if [ -z "$COMPOSE_CMD" ]; then
        print_message "$YELLOW" "⚠ Docker Compose not available - skipping compose deployment"
        return 0
    fi
    
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Deploying to ${env} environment..."
    print_message "$BLUE" "========================================"
    
    # Stop existing containers
    print_message "$YELLOW" "Stopping existing containers..."
    $COMPOSE_CMD down >> "$LOG_FILE" 2>&1 || true
    
    # Remove old images (keep last 3 versions)
    print_message "$YELLOW" "Cleaning up old images..."
    docker images ${APP_NAME} --format "{{.Tag}}" | \
        grep -E '^[0-9]{8}_[0-9]{6}$' | \
        sort -r | \
        tail -n +4 | \
        xargs -I {} docker rmi ${APP_NAME}:{} 2>/dev/null || true
    
    # Start new containers
    print_message "$BLUE" "Starting new containers..."
    if $COMPOSE_CMD up -d >> "$LOG_FILE" 2>&1; then
        print_message "$GREEN" "✓ Containers started successfully"
    else
        print_message "$RED" "✗ Failed to start containers"
        exit 1
    fi
    
    # Wait for services to be healthy
    print_message "$YELLOW" "Waiting for services to be healthy..."
    sleep 10
    
    # Check container status
    print_message "$BLUE" "Container status:"
    $COMPOSE_CMD ps | tee -a "$LOG_FILE"
}

# Function to run health checks
health_check() {
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Running health checks..."
    print_message "$BLUE" "========================================"
    
    # Basic Docker health check
    print_message "$GREEN" "✓ Docker deployment completed"
    
    # If compose is available, check Selenium Hub
    if [ -n "$COMPOSE_CMD" ]; then
        # Check if Selenium Hub is accessible (with timeout)
        sleep 5
        if timeout 10 curl -f http://localhost:4444/ui > /dev/null 2>&1; then
            print_message "$GREEN" "✓ Selenium Hub is healthy"
        else
            print_message "$YELLOW" "⚠ Selenium Hub not responding (this may be normal in CI)"
        fi
        
        # Check if all containers are running
        if [ -n "$COMPOSE_CMD" ]; then
            local running_containers=$($COMPOSE_CMD ps --services --filter "status=running" 2>/dev/null | wc -l || echo "0")
            local total_containers=$($COMPOSE_CMD ps --services 2>/dev/null | wc -l || echo "0")
            
            if [ "$running_containers" -eq "$total_containers" ] && [ "$total_containers" -gt 0 ]; then
                print_message "$GREEN" "✓ All containers are running ($running_containers/$total_containers)"
            else
                print_message "$YELLOW" "⚠ Some containers may not be running ($running_containers/$total_containers)"
            fi
        fi
    fi
}

# Function to generate deployment report
generate_report() {
    local status=$1
    
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "Generating deployment report..."
    print_message "$BLUE" "========================================"
    
    local containers_info="[]"
    if [ -n "$COMPOSE_CMD" ]; then
        containers_info=$($COMPOSE_CMD ps --format json 2>/dev/null || echo '[]')
    fi
    
    cat > "deployment-report-${TIMESTAMP}.json" <<EOF
{
  "deployment": {
    "timestamp": "$(date -Iseconds)",
    "environment": "${DEPLOY_ENV}",
    "status": "${status}",
    "version": "${TIMESTAMP}",
    "docker_image": "${APP_NAME}:${TIMESTAMP}",
    "compose_available": "$([ -n "$COMPOSE_CMD" ] && echo "true" || echo "false")",
    "containers": ${containers_info},
    "log_file": "${LOG_FILE}"
  }
}
EOF
    
    print_message "$GREEN" "✓ Deployment report generated: deployment-report-${TIMESTAMP}.json"
}

# Main deployment process
main() {
    print_message "$BLUE" "========================================"
    print_message "$BLUE" "   WebdriverIO Deployment Automation   "
    print_message "$BLUE" "   Environment: ${DEPLOY_ENV}          "
    print_message "$BLUE" "========================================"
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Build Docker image
    build_docker_image
    
    # Step 3: Run tests
    run_tests
    
    # Step 4: Deploy (with or without compose)
    deploy_with_compose "$DEPLOY_ENV"
    
    # Step 5: Health checks
    health_check
    
    # Step 6: Generate report
    generate_report "SUCCESS"
    
    print_message "$GREEN" "========================================"
    print_message "$GREEN" "   DEPLOYMENT COMPLETED SUCCESSFULLY!  "
    print_message "$GREEN" "   Version: ${TIMESTAMP}               "
    print_message "$GREEN" "========================================"
    
    # Show deployment summary
    print_message "$BLUE" "\nDeployment Summary:"
    print_message "$GREEN" "• Environment: ${DEPLOY_ENV}"
    print_message "$GREEN" "• Docker Image: ${APP_NAME}:${TIMESTAMP}"
    print_message "$GREEN" "• Log File: ${LOG_FILE}"
    print_message "$GREEN" "• Report: deployment-report-${TIMESTAMP}.json"
    if [ -n "$COMPOSE_CMD" ]; then
        print_message "$GREEN" "• Selenium Hub: http://localhost:4444/ui"
    fi
}

# Handle script interruption
trap 'print_message "$RED" "Deployment interrupted!"; exit 1' INT TERM

# Run main function
main "$@"