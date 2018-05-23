podTemplate(
    label: 'BuilderPod',
    containers: [
        containerTemplate(
            name: 'builder',
            image: 'wolmi/helm-docker:latest',
            ttyEnabled: true,
            envVar: [
                secretEnvVar(key: 'GOOGLE_APPLICATION_CREDENTIALS', value: '/var/secrets/google/key.json'),
            ],
            command: 'cat'
        )
    ],
    volumes: [
        secretVolume(mountPath: '/var/secrets/google', secretName: 'image-builder-key'),
        hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock'),
    ]) {
    node('BuilderPod') {
        def JOB_TAG = "jenkins-${JOB_NAME}-${BUILD_NUMBER}";
        ansiColor('xterm') {
            container('builder') {
                def TAG;
                stage('git pull') {
                    checkout([$class: 'GitSCM', branches: [[name: '**']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[credentialsId: '431e5fa4-b23f-4686-819e-afce145d32c8', url: 'https://github.com/MashMeTV/new-licode.git']]])
                    TAG = sh (
                        script: 'git describe',
                        returnStdout: true
                    ).trim();
                }
                stage('Build images') {
                    sh "docker build -t licode:${TAG} ."
                }
                stage("Push images"){
                    sh "docker login -u oauth2accesstoken -p \"\$(gcloud auth application-default print-access-token)\" https://eu.gcr.io";
                    sh "docker tag licode:${TAG} eu.gcr.io/mashmetv/licode:${TAG}"
                    sh "docker push eu.gcr.io/mashmetv/licode:${TAG}"
                }
            }
        }
    }
}
