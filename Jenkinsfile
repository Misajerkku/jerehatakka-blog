pipeline {
  agent any

  environment {
    SONARQUBE_ENV = 'SonarQubeLocal'
  }

  tools {
    // Remove if you don't use Node/TS
    nodejs 'node18'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout(scm)
        sh 'git log -1 --pretty=oneline || true'
      }
    }

    stage('Install Dependencies') {
      when {
        expression { fileExists('package.json') }
      }
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
      when {
        expression { fileExists('package.json') }
      }
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
        dependencyCheck additionalArguments: '''
          --format "HTML" \
          --format "XML" \
          --scan "." \
          --out "dependency-check-report" \
          --enableRetired
        ''', odcInstallation: 'OWASP Dependency-Check'
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
    failure { echo '❌ Build failed' }
  }
}
