# Liquid Android Proguard / R8 Optimization Rules

# Keep entire liquid runtime package (JNI bridge, views, layouts, callbacks)
-keep class com.liquid.runtime.** { *; }
-keepclassmembers class com.liquid.runtime.** { *; }
-keepclassmembernames class com.liquid.runtime.** { *; }

# Keep native methods across all classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Activity and Application subclasses
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
