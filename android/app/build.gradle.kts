import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Версия берётся из package.json веб-приложения: у PWA и APK она одна.
val webVersion: String = Regex(""""version"\s*:\s*"([^"]+)"""")
    .find(rootProject.file("../package.json").readText())!!.groupValues[1]
val (vMajor, vMinor, vPatch) = webVersion.split(".").map { it.toInt() }

// Ключ подписи лежит вне репозитория: %APPDATA%\training-diary\android-keystore.properties.
val keystoreProperties = Properties().apply {
    val appData = System.getenv("APPDATA") ?: System.getProperty("user.home")
    val file = File(appData, "training-diary/android-keystore.properties")
    if (file.isFile) file.inputStream().use { load(it) }
}
val hasReleaseKey = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.bablakov.trainingdiary"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bablakov.trainingdiary"
        minSdk = 29
        targetSdk = 35
        versionCode = vMajor * 10000 + vMinor * 100 + vPatch
        versionName = webVersion
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (hasReleaseKey) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

// Без собранного веб-приложения APK пустой: напоминаем, а не молча собираем белый экран.
tasks.named("preBuild") {
    doFirst {
        check(file("src/main/assets/www/index.html").isFile) {
            "Нет src/main/assets/www — сначала `npm run build:android` в корне проекта"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
