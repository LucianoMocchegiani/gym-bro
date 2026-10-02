allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// AGP 8+ exige `namespace`. isar_flutter_libs 3.1 (via identity_core_dart) no lo declara.
subprojects {
    pluginManager.withPlugin("com.android.library") {
        val android = extensions.getByName("android")
        val current =
            runCatching {
                android.javaClass.methods
                    .first { it.name == "getNamespace" && it.parameterCount == 0 }
                    .invoke(android) as? String
            }.getOrNull()
        if (current.isNullOrBlank()) {
            val fallback =
                group.toString().ifBlank { "dev.flutter.${name.replace("-", "_")}" }
            android.javaClass.methods
                .first { it.name == "setNamespace" && it.parameterCount == 1 }
                .invoke(android, fallback)
        }
    }
}

// isar_flutter_libs 3.1 compila con SDK 30 y el release falla con
// "resource android:attr/lStar not found".
subprojects {
    if (name == "isar_flutter_libs") {
        afterEvaluate {
            val android = extensions.getByName("android")
            android.javaClass.methods
                .first {
                    it.name == "setCompileSdkVersion" &&
                        it.parameterCount == 1 &&
                        it.parameterTypes[0] == Int::class.javaPrimitiveType
                }
                .invoke(android, 36)
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
