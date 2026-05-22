const fs = require("fs/promises");
const path = require("path");

const { withDangerousMod } = require("@expo/config-plugins");

const MODULE_NAME = "SOSyncMarkerIcon";
const PACKAGE_IMPORT = "import com.sosync.mobile.SOSyncMarkerIconPackage";
const PACKAGE_REGISTRATION = "add(SOSyncMarkerIconPackage())";

const moduleSource = `package com.sosync.mobile

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.net.URL
import java.security.MessageDigest
import kotlin.math.max

class SOSyncMarkerIconModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "${MODULE_NAME}"

  @ReactMethod
  fun buildMarkerIcon(options: ReadableMap, promise: Promise) {
    try {
      val markerId = options.getOptionalString("markerId").ifBlank { "marker" }
      val mapTheme = options.getOptionalString("mapTheme").ifBlank { "light" }
      val isCenter = options.getOptionalBoolean("isCenter")
      val displayName = options.getOptionalString("displayName")
      val photoURL = options.getOptionalString("photoURL")
      val isCurrentUser = options.getOptionalBoolean("isCurrentUser")
      val isHighlighted = options.getOptionalBoolean("isHighlighted")
      val cacheKey = listOf(markerId, mapTheme, isCenter, displayName, photoURL, isCurrentUser, isHighlighted).joinToString("|")
      val outputDir = File(reactContext.cacheDir, "sosync-marker-icons")
      outputDir.mkdirs()
      val outputFile = File(outputDir, "\${sha256(cacheKey)}.png")

      if (outputFile.exists() && outputFile.length() > 0) {
        promise.resolve(outputFile.absolutePath)
        return
      }

      val bitmap = if (isCenter) {
        drawCenterMarker(mapTheme)
      } else {
        drawMemberMarker(displayName, photoURL, mapTheme, isCurrentUser)
      }

      outputFile.outputStream().use { stream ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
      }
      bitmap.recycle()
      promise.resolve(outputFile.absolutePath)
    } catch (error: Exception) {
      promise.reject("ERR_SOSYNC_MARKER_ICON", "Failed to build map marker icon.", error)
    }
  }

  private fun drawMemberMarker(displayName: String, photoURL: String, mapTheme: String, isCurrentUser: Boolean): Bitmap {
    val size = 132
    val scale = reactContext.resources.displayMetrics.density
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val center = size / 2f
    val outerRadius = 58f
    val avatarRadius = 48f
    val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      shader = LinearGradient(
        0f,
        0f,
        size.toFloat(),
        size.toFloat(),
        if (isCurrentUser) Color.rgb(122, 12, 24) else if (mapTheme == "dark") Color.rgb(255, 246, 235) else Color.WHITE,
        if (isCurrentUser) Color.rgb(214, 82, 78) else Color.rgb(214, 82, 78),
        Shader.TileMode.CLAMP,
      )
    }

    val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(if (mapTheme == "dark") 110 else 70, 38, 25, 30)
      setShadowLayer(10f * scale, 0f, 4f * scale, color)
    }
    canvas.drawCircle(center, center + 4f, outerRadius, shadowPaint)
    canvas.drawCircle(center, center, outerRadius, borderPaint)

    val avatarBitmap = loadRemoteBitmap(photoURL)
    if (avatarBitmap != null) {
      canvas.drawBitmap(cropCircle(avatarBitmap, (avatarRadius * 2).toInt()), center - avatarRadius, center - avatarRadius, null)
      avatarBitmap.recycle()
    } else {
      val fallbackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (mapTheme == "dark") Color.rgb(54, 42, 44) else Color.rgb(248, 238, 231)
      }
      canvas.drawCircle(center, center, avatarRadius, fallbackPaint)
      val initials = initialsFor(displayName)
      val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isCurrentUser) Color.rgb(122, 12, 24) else Color.rgb(94, 64, 68)
        textAlign = Paint.Align.CENTER
        textSize = 30f
        typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
      }
      val textBounds = Rect()
      textPaint.getTextBounds(initials, 0, initials.length, textBounds)
      canvas.drawText(initials, center, center - textBounds.exactCenterY(), textPaint)
    }

    val innerStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = if (mapTheme == "dark") Color.argb(160, 255, 255, 255) else Color.argb(210, 255, 255, 255)
      style = Paint.Style.STROKE
      strokeWidth = 4f
    }
    canvas.drawCircle(center, center, avatarRadius, innerStrokePaint)
    return bitmap
  }

  private fun drawCenterMarker(mapTheme: String): Bitmap {
    val width = 132
    val height = 150
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val centerX = width / 2f
    val topCenterY = 58f

    val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(if (mapTheme == "dark") 130 else 70, 38, 25, 30)
      setShadowLayer(12f, 0f, 5f, color)
    }
    canvas.drawCircle(centerX, topCenterY + 5f, 50f, shadowPaint)

    val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = if (mapTheme == "dark") Color.rgb(255, 246, 235) else Color.WHITE
      style = Paint.Style.FILL
    }
    val pinPath = Path().apply {
      addCircle(centerX, topCenterY, 50f, Path.Direction.CW)
      moveTo(centerX - 18f, topCenterY + 40f)
      lineTo(centerX, height - 10f)
      lineTo(centerX + 18f, topCenterY + 40f)
      close()
    }
    canvas.drawPath(pinPath, pinPaint)

    val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.rgb(122, 12, 24)
      style = Paint.Style.FILL
    }
    canvas.drawCircle(centerX, topCenterY, 34f, accentPaint)

    val housePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      style = Paint.Style.STROKE
      strokeCap = Paint.Cap.ROUND
      strokeJoin = Paint.Join.ROUND
      strokeWidth = 6f
    }
    val roof = Path().apply {
      moveTo(centerX - 20f, topCenterY - 2f)
      lineTo(centerX, topCenterY - 20f)
      lineTo(centerX + 20f, topCenterY - 2f)
    }
    canvas.drawPath(roof, housePaint)
    canvas.drawRect(RectF(centerX - 15f, topCenterY - 2f, centerX + 15f, topCenterY + 20f), housePaint)
    return bitmap
  }

  private fun cropCircle(source: Bitmap, size: Int): Bitmap {
    val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val scaled = Bitmap.createScaledBitmap(source, size, size, true)
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
    canvas.drawBitmap(scaled, 0f, 0f, paint)
    scaled.recycle()
    return output
  }

  private fun loadRemoteBitmap(photoURL: String): Bitmap? {
    if (photoURL.isBlank()) return null
    return try {
      URL(photoURL).openStream().use { stream -> BitmapFactory.decodeStream(stream) }
    } catch (_: Exception) {
      null
    }
  }

  private fun initialsFor(displayName: String): String {
    val parts = displayName.trim().split(Regex("\\\\s+")).filter { it.isNotBlank() }
    val initials = parts.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.joinToString("")
    return initials.ifBlank { "?" }
  }

  private fun sha256(value: String): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun ReadableMap.getOptionalString(key: String): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: "" else ""

  private fun ReadableMap.getOptionalBoolean(key: String): Boolean =
    if (hasKey(key) && !isNull(key)) getBoolean(key) else false
}
`;

const packageSource = `package com.sosync.mobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SOSyncMarkerIconPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(SOSyncMarkerIconModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;

async function writeMarkerIconSources(platformProjectRoot) {
  const packageDir = path.join(platformProjectRoot, "app/src/main/java/com/sosync/mobile");
  await fs.mkdir(packageDir, { recursive: true });
  await fs.writeFile(path.join(packageDir, "SOSyncMarkerIconModule.kt"), moduleSource);
  await fs.writeFile(path.join(packageDir, "SOSyncMarkerIconPackage.kt"), packageSource);
}

async function registerMarkerIconPackage(platformProjectRoot) {
  const mainApplicationPath = path.join(platformProjectRoot, "app/src/main/java/com/sosync/mobile/MainApplication.kt");
  let contents = await fs.readFile(mainApplicationPath, "utf8");

  if (!contents.includes(PACKAGE_IMPORT)) {
    contents = contents.replace(/(import com\.facebook\.react\.ReactPackage\n)/, `$1${PACKAGE_IMPORT}\n`);
  }

  if (!contents.includes(PACKAGE_REGISTRATION)) {
    contents = contents.replace(
      /(\s*)\/\/ Packages that cannot be autolinked yet can be added manually here, for example:\n(\s*)\/\/ add\(MyReactNativePackage\(\)\)/,
      `$1// Packages that cannot be autolinked yet can be added manually here, for example:\n$2// add(MyReactNativePackage())\n$2${PACKAGE_REGISTRATION}`,
    );
  }

  await fs.writeFile(mainApplicationPath, contents);
}

module.exports = function withAndroidMarkerIconModule(config) {
  return withDangerousMod(config, [
    "android",
    async (nextConfig) => {
      const platformProjectRoot =
        nextConfig.modRequest.platformProjectRoot ?? path.join(nextConfig.modRequest.projectRoot, "android");

      await writeMarkerIconSources(platformProjectRoot);
      await registerMarkerIconPackage(platformProjectRoot);

      return nextConfig;
    },
  ]);
};
