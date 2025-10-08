pipeline {
  agent any

  options { skipDefaultCheckout(true) }

  environment {
    SONARQUBE_ENV = 'SonarQubeLocal'
    REPO_URL      = 'https://github.com/Misajerkku/jerehatakka-blog.git'
    REPO_BRANCH   = 'main'
  }

  tools { nodejs 'node18' }

  stages {

    stage('Checkout') {
      steps {
        deleteDir()
        git branch: "${env.REPO_BRANCH}", url: "${env.REPO_URL}"
        sh 'git log -1 --pretty=oneline || true'
      }
    }

    stage('Install Dependencies') {
      when { expression { fileExists('package.json') } }
      steps {
        sh '''
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi
        '''
      }
    }

    stage('Build') {
      when {
        anyOf {
          expression { fileExists('tsconfig.json') }
          expression { fileExists('package.json') }
        }
      }
      steps {
        sh '''
          if [ -f tsconfig.json ]; then
            npm run build || true
          fi
        '''
      }
    }

    stage('Unit Tests') {
      when { expression { fileExists('package.json') } }
      steps {
        sh 'npm test || true'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/junit*.xml,**/test-results/*.xml'
          archiveArtifacts artifacts: 'coverage/**', onlyIfSuccessful: false, fingerprint: true
        }
      }
    }

    stage('OWASP Dependency-Check') {
  steps {
    retry(2) {
      timeout(time: 30, unit: 'MINUTES') {
        sh '''
          set -eux
          mkdir -p dependency-check-report dc-data

          # Remove any leftover lock/temp files from aborted runs
          find dc-data -maxdepth 1 -type f \( -name "*.lck" -o -name "*.lock" -o -name "*.tmp" -o -name "*trace.db" \) -delete || true

          # Warm/update the local CVE DB only if it's missing/empty
          if [ ! -s dc-data/odc.mv.db ]; then
            docker run --rm \
              -v "$PWD/dc-data":/usr/share/dependency-check/data \
              owasp/dependency-check:latest \
              --updateonly
          fi

          # Actual scan (no update), exclude heavy/irrelevant folders
          docker run --rm \
            -v "$PWD":/src \
            -v "$PWD/dc-data":/usr/share/dependency-check/data \
            -v "$PWD/dependency-check-report":/report \
            owasp/dependency-check:latest \
            --noupdate \
            --scan /src \
            --exclude "**/.git/**" \
            --exclude "**/node_modules/**" \
            --exclude "**/dist/**" \
            --exclude "**/build/**" \
            --exclude "**/coverage/**" \
            --format "HTML" --format "XML" \
            --out /report \
            --enableRetired
        '''
      }
    }
  }
  post {
    always {
      publishHTML(target: [
        allowMissing: true,
        keepAll: true,
        reportDir: 'dependency-check-report',
        reportFiles: 'dependency-check-report.html',
        reportName: 'Dependency-Check Report'
      ])
      dependencyCheckPublisher pattern: 'dependency-check-report/dependency-check-report.xml'
      archiveArtifacts artifacts: 'dependency-check-report/**', onlyIfSuccessful: false, fingerprint: true
    }
    unsuccessful {
      script { currentBuild.result = currentBuild.result ?: 'UNSTABLE' }
    }
  }
}


    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv("${env.SONARQUBE_ENV}") {
          sh '''
            if command -v sonar-scanner >/dev/null 2>&1; then
              sonar-scanner
            else
              npx --yes sonarqube-scanner || true
            fi
          '''
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          script {
            def qg = waitForQualityGate()
            if (qg.status != 'OK') {
              error "Quality Gate failed: ${qg.status}"
            }
          }
        }
      }
    }
  }

  post {
    success  { echo 'Build successful' }
    unstable { echo 'Build unstable' }
    failure  { echo 'Build failed' }
  }
}
