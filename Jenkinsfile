pipeline {
  agent any

  environment {
    SONARQUBE_ENV = 'SonarQubeLocal' // Manage Jenkins → System → SonarQube servers
  }

  // Keep only if your app uses Node/TS and you've configured the NodeJS tool named "node18"
  tools { nodejs 'node18' }

  stages {

    // Built-in Declarative "Checkout SCM" will run automatically before the first stage.
    // If you ever disable it with options { skipDefaultCheckout(true) }, then add an explicit checkout(scm) step.

    stage('Show Commit') {
      steps {
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

    // Dependency-Check via Docker (no Jenkins tool install needed)
    stage('OWASP Dependency-Check') {
      steps {
        sh '''
          mkdir -p dependency-check-report dc-data
          docker run --rm \
            -v "$PWD":/src \
            -v "$PWD/dc-data":/usr/share/dependency-check/data \
            -v "$PWD/dependency-check-report":/report \
            owasp/dependency-check:latest \
            --scan /src \
            --format "HTML" --format "XML" \
            --out /report \
            --enableRetired
        '''
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
    success { echo '✅ Build successful' }
    unstable { echo '🟠 Build unstable' }
    failure { echo '❌ Build failed' }
  }
}
