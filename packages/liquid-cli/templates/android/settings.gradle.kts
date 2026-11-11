pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "LiquidApp"
val appBuildFile = file("app/build.gradle.kts")
if (appBuildFile.exists() && !appBuildFile.readText().contains("{{PACKAGE_NAME}}")) {
    include(":app")
}
include(":liquid-android-runtime")
include(":liquid-dev-app")
