import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controllerPath = path.join(
  rootDir,
  "node_modules",
  "@googlemaps",
  "react-native-navigation-sdk",
  "android",
  "src",
  "main",
  "java",
  "com",
  "google",
  "android",
  "react",
  "navsdk",
  "MapViewController.java",
);
const packageRoot = path.join(rootDir, "node_modules", "@googlemaps", "react-native-navigation-sdk");

const patchFile = (filePath, patcher) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const currentSource = fs.readFileSync(filePath, "utf8");
  const nextSource = patcher(currentSource);
  if (nextSource !== currentSource) {
    fs.writeFileSync(filePath, nextSource);
    return true;
  }

  return false;
};

if (!fs.existsSync(controllerPath)) {
  console.warn("[patchNavigationSdk] Navigation SDK controller not found; skipping patch.");
  process.exit(0);
}

let source = fs.readFileSync(controllerPath, "utf8");
let patched = source;

patched = patched.replaceAll(
  "BitmapDescriptor icon = BitmapDescriptorFactory.fromAsset(imagePath);\n        options.icon(icon);",
  "BitmapDescriptor icon = getBitmapDescriptorFromPath(imagePath);\n        options.icon(icon);\n        options.anchor(0.5f, 0.5f);",
);

patched = patched.replaceAll(
  "BitmapDescriptor icon = BitmapDescriptorFactory.fromAsset(imagePath);\n        marker.setIcon(icon);",
  "BitmapDescriptor icon = getBitmapDescriptorFromPath(imagePath);\n        marker.setIcon(icon);\n        marker.setAnchor(0.5f, 0.5f);",
);

patched = patched.replaceAll(
  "BitmapDescriptor bitmapDescriptor = BitmapDescriptorFactory.fromAsset(imagePath);",
  "BitmapDescriptor bitmapDescriptor = getBitmapDescriptorFromPath(imagePath);",
);

patched = patched.replace(
  "        val bitmap = if (getBoolean(options, \"isCenter\")) {\n          drawCenterIcon()\n        } else {\n          drawAvatarIcon(options)\n        }",
  "        val bitmap = if (getBoolean(options, \"isCenter\")) {\n          drawCenterIcon(getString(options, \"mapTheme\") == \"dark\")\n        } else {\n          drawAvatarIcon(options)\n        }",
);

patched = patched.replace(
  "  private fun drawCenterIcon(): Bitmap {",
  "  private fun drawCenterIcon(dark: Boolean): Bitmap {",
);

patched = patched.replace(
  "    paint.color = Color.rgb(31, 41, 55)\n    canvas.drawCircle(center, center, 50f, paint)\n    paint.style = Paint.Style.STROKE\n    paint.strokeWidth = 4f\n    paint.color = Color.rgb(216, 201, 196)\n    canvas.drawCircle(center, center, 50f, paint)\n\n    val accent = Color.rgb(122, 12, 24)\n",
  "    paint.style = Paint.Style.FILL\n    paint.color = if (dark) Color.rgb(39, 45, 56) else Color.WHITE\n    canvas.drawCircle(center, center, 49f, paint)\n\n    paint.color = if (dark) Color.argb(110, 255, 255, 255) else Color.rgb(223, 211, 205)\n    paint.style = Paint.Style.STROKE\n    paint.strokeWidth = 3.5f\n    canvas.drawCircle(center, center, 49f, paint)\n\n    val accent = if (dark) Color.rgb(212, 84, 78) else Color.rgb(122, 12, 24)\n",
);

patched = patched.replace(
  "      listOf(\n        getString(options, \"markerId\"),\n        \"center\",\n        \"static\",\n      )",
  "      listOf(\n        getString(options, \"markerId\"),\n        \"center\",\n        getString(options, \"mapTheme\"),\n        \"static\",\n      )",
);

if (!patched.includes("import android.graphics.Paint;")) {
  patched = patched.replace(
    "import android.graphics.Color;\nimport android.graphics.Path;\nimport android.graphics.Typeface;",
    "import android.graphics.Color;\nimport android.graphics.Paint;\nimport android.graphics.Path;\nimport android.graphics.Typeface;",
  );
}

patched = patched.replace(
  "    mGoogleMap.setOnMarkerClickListener(\n        marker -> {\n          mNavigationViewCallback.onMarkerClick(marker);\n          return false;\n        });",
  "    mGoogleMap.setOnMarkerClickListener(\n        marker -> {\n          mNavigationViewCallback.onMarkerClick(marker);\n          String effectiveId = getMarkerEffectiveId(marker.getId());\n          if (effectiveId != null\n              && (effectiveId.startsWith(\"member:\") || effectiveId.startsWith(\"center:\"))) {\n            marker.showInfoWindow();\n            return true;\n          }\n\n          return false;\n        });",
);

patched = patched.replace(
  "if (effectiveId != null && effectiveId.startsWith(\"member:\")) {\n            marker.showInfoWindow();\n            return true;\n          }\n\n          if (effectiveId != null && effectiveId.startsWith(\"center:\")) {\n            marker.hideInfoWindow();\n            return true;\n          }\n\n          return false;",
  "if (effectiveId != null\n              && (effectiveId.startsWith(\"member:\") || effectiveId.startsWith(\"center:\"))) {\n            marker.showInfoWindow();\n            return true;\n          }\n\n          return false;",
);

if (!patched.includes("mGoogleMap.setInfoWindowAdapter(")) {
  patched = patched.replace(
    "    mGoogleMap.setOnInfoWindowClickListener(\n        marker -> mNavigationViewCallback.onMarkerInfoWindowTapped(marker));\n    mGoogleMap.setOnMapClickListener(latLng -> mNavigationViewCallback.onMapClick(latLng));",
    "    mGoogleMap.setOnInfoWindowClickListener(\n        marker -> mNavigationViewCallback.onMarkerInfoWindowTapped(marker));\n    mGoogleMap.setOnMapClickListener(latLng -> mNavigationViewCallback.onMapClick(latLng));\n    mGoogleMap.setOnCameraMoveStartedListener(\n        reason -> {\n          if (reason == GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) {\n            hideAllInfoWindows();\n            mNavigationViewCallback.onMapGestureStarted();\n          }\n        });\n    mGoogleMap.setInfoWindowAdapter(\n        new GoogleMap.InfoWindowAdapter() {\n          @Override\n          public android.view.View getInfoWindow(Marker marker) {\n            if (marker == null) {\n              return null;\n            }\n\n            String effectiveId = getMarkerEffectiveId(marker.getId());\n            if (effectiveId == null || (!effectiveId.startsWith(\"member:\") && !effectiveId.startsWith(\"center:\"))) {\n              return null;\n            }\n\n            return createModernInfoWindow(marker.getTitle(), effectiveId.startsWith(\"center:\"));\n          }\n\n          @Override\n          public android.view.View getInfoContents(Marker marker) {\n            return null;\n          }\n        });",
  );
}

patched = patched.replace(
  "mGoogleMap.setOnCameraMoveStartedListener(reason -> hideAllInfoWindows());",
  "mGoogleMap.setOnCameraMoveStartedListener(\n        reason -> {\n          if (reason == GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) {\n            hideAllInfoWindows();\n            mNavigationViewCallback.onMapGestureStarted();\n          }\n        });",
);

patched = patched.replace(
  "if (reason == GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) {\n            hideAllInfoWindows();\n          }",
  "if (reason == GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) {\n            hideAllInfoWindows();\n            mNavigationViewCallback.onMapGestureStarted();\n          }",
);

patched = patched.replace(
  "return createModernInfoWindow(marker.getTitle());",
  "return createModernInfoWindow(marker.getTitle(), effectiveId.startsWith(\"center:\"));",
);

patched = patched.replace(
  "return createModernInfoWindow(marker.getTitle(), effectiveId.startsWith(\"center:\"));",
  "String title = markerTitleMap.get(effectiveId);\n            return createModernInfoWindow(title, effectiveId.startsWith(\"center:\"));",
);

patched = patched.replace(
  "if (effectiveId == null || !effectiveId.startsWith(\"member:\")) {\n              return null;\n            }",
  "if (effectiveId == null\n                || (!effectiveId.startsWith(\"member:\") && !effectiveId.startsWith(\"center:\"))) {\n              return null;\n            }",
);

patched = patched.replace(
  "return createModernInfoWindow(title, false);",
  "return createModernInfoWindow(title, effectiveId.startsWith(\"center:\"));",
);

if (!patched.includes("private final Map<String, String> markerTitleMap = new HashMap<>();")) {
  patched = patched.replace(
    "  private final Map<String, Marker> markerMap = new HashMap<>();\n",
    "  private final Map<String, Marker> markerMap = new HashMap<>();\n  private final Map<String, String> markerTitleMap = new HashMap<>();\n",
  );
}

if (!patched.includes("markerTitleMap.put(effectiveId, title != null ? title : \"\");")) {
  patched = patched.replace(
    "    markerMap.put(effectiveId, marker);\n    markerNativeIdToEffectiveId.put(marker.getId(), effectiveId);",
    "    markerMap.put(effectiveId, marker);\n    markerTitleMap.put(effectiveId, title != null ? title : \"\");\n    markerNativeIdToEffectiveId.put(marker.getId(), effectiveId);",
  );
}

if (!patched.includes("String effectiveId = getMarkerEffectiveId(marker.getId());\n    String imagePath = CollectionUtil.getString(\"imgPath\", optionsMap);")) {
  patched = patched.replace(
    "  private void updateMarker(Marker marker, Map<String, Object> optionsMap) {\n    String imagePath = CollectionUtil.getString(\"imgPath\", optionsMap);",
    "  private void updateMarker(Marker marker, Map<String, Object> optionsMap) {\n    String effectiveId = getMarkerEffectiveId(marker.getId());\n    String imagePath = CollectionUtil.getString(\"imgPath\", optionsMap);",
  );
}

if (!patched.includes("markerTitleMap.put(effectiveId, title);")) {
  patched = patched.replace(
    "    if (title != null) {\n      marker.setTitle(title);\n    }",
    "    if (title != null) {\n      marker.setTitle(title);\n      markerTitleMap.put(effectiveId, title);\n    }",
  );
}

if (!patched.includes("markerMap.clear();\n    markerTitleMap.clear();")) {
  patched = patched.replace(
    "    markerMap.clear();\n    polylineMap.clear();",
    "    markerMap.clear();\n    markerTitleMap.clear();\n    polylineMap.clear();",
  );
}

patched = patched.replace(
  "style = fetchJsonFromUrl(url);",
  "style = resolveMapStyle(url);",
);

patched = patched.replace(
  "style = isRawJsonStyle(url) ? url : fetchJsonFromUrl(url);",
  "style = resolveMapStyle(url);",
);

patched = patched.replace(
  "throw new RuntimeException(e);",
  "android.util.Log.w(\"MapViewController\", \"Unable to resolve map style.\", e);\n                return;",
);

if (!patched.includes("if (mGoogleMap == null) {\n                        return;\n                      }\n                      MapStyleOptions options = new MapStyleOptions(style);")) {
  patched = patched.replace(
    "MapStyleOptions options = new MapStyleOptions(style);\n                      mGoogleMap.setMapStyle(options);",
    "if (mGoogleMap == null) {\n                        return;\n                      }\n                      MapStyleOptions options = new MapStyleOptions(style);\n                      mGoogleMap.setMapStyle(options);",
  );
}

const helper = `
  private android.view.View createModernInfoWindow(String title, boolean showDirectionsIcon) {
    Activity activity = activitySupplier != null ? activitySupplier.get() : null;
    if (activity == null) {
      return null;
    }

    String labelText =
        title != null && !title.trim().isEmpty()
            ? title.trim()
            : showDirectionsIcon ? "Safety hub" : "Circle member";
    android.graphics.Paint textPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    textPaint.setColor(android.graphics.Color.rgb(39, 34, 34));
    textPaint.setTextSize(dpToPx(showDirectionsIcon ? 16 : 18));
    textPaint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
    textPaint.setTextAlign(android.graphics.Paint.Align.LEFT);

    int maxTextWidth = dpToPx(showDirectionsIcon ? 190 : 220);
    String displayedText = ellipsizeText(labelText, textPaint, maxTextWidth);
    float textWidth = textPaint.measureText(displayedText);
    android.graphics.Paint.FontMetrics fontMetrics = textPaint.getFontMetrics();
    int textHeight = Math.round(fontMetrics.descent - fontMetrics.ascent);
    int iconSize = showDirectionsIcon ? dpToPx(22) : 0;
    int iconGap = showDirectionsIcon ? dpToPx(10) : 0;
    int horizontalPadding = showDirectionsIcon ? dpToPx(20) : dpToPx(26);
    int verticalPadding = dpToPx(15);
    int shadowPadding = dpToPx(8);
    int tailHeight = dpToPx(12);
    int tailWidth = dpToPx(18);
    int bubbleWidth =
        Math.round(textWidth) + iconSize + iconGap + horizontalPadding * 2;
    int bubbleHeight = Math.max(textHeight + verticalPadding * 2, dpToPx(48));
    int bitmapWidth = bubbleWidth + shadowPadding * 2;
    int bitmapHeight = bubbleHeight + tailHeight + shadowPadding * 2;
    android.graphics.Bitmap bitmap =
        android.graphics.Bitmap.createBitmap(bitmapWidth, bitmapHeight, android.graphics.Bitmap.Config.ARGB_8888);
    android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);

    android.graphics.Paint bubblePaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    bubblePaint.setColor(android.graphics.Color.WHITE);
    bubblePaint.setStyle(android.graphics.Paint.Style.FILL);
    bubblePaint.setShadowLayer(dpToPx(5), 0, dpToPx(3), android.graphics.Color.argb(42, 22, 24, 29));

    android.graphics.RectF bubbleRect =
        new android.graphics.RectF(
            shadowPadding,
            shadowPadding,
            shadowPadding + bubbleWidth,
            shadowPadding + bubbleHeight);
    canvas.drawRoundRect(bubbleRect, dpToPx(24), dpToPx(24), bubblePaint);

    android.graphics.Paint strokePaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    strokePaint.setColor(android.graphics.Color.rgb(235, 228, 224));
    strokePaint.setStyle(android.graphics.Paint.Style.STROKE);
    strokePaint.setStrokeWidth(dpToPx(1));
    canvas.drawRoundRect(bubbleRect, dpToPx(24), dpToPx(24), strokePaint);

    android.graphics.Path tailPath = new android.graphics.Path();
    float tailCenterX = bitmapWidth / 2f;
    float tailTop = bubbleRect.bottom - dpToPx(1);
    tailPath.moveTo(tailCenterX - tailWidth / 2f, tailTop);
    tailPath.lineTo(tailCenterX + tailWidth / 2f, tailTop);
    tailPath.lineTo(tailCenterX, tailTop + tailHeight);
    tailPath.close();
    bubblePaint.clearShadowLayer();
    canvas.drawPath(tailPath, bubblePaint);
    canvas.drawPath(tailPath, strokePaint);

    float textX = bubbleRect.left + horizontalPadding;
    float textBaseline =
        bubbleRect.top + bubbleHeight / 2f - (fontMetrics.ascent + fontMetrics.descent) / 2f;
    canvas.drawText(displayedText, textX, textBaseline, textPaint);

    if (showDirectionsIcon) {
      android.graphics.Paint iconPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
      iconPaint.setColor(android.graphics.Color.rgb(122, 12, 24));
      iconPaint.setStyle(android.graphics.Paint.Style.FILL);
      android.graphics.Path iconPath = new android.graphics.Path();
      float iconLeft = textX + textWidth + iconGap;
      float iconTop = bubbleRect.top + (bubbleHeight - iconSize) / 2f;
      iconPath.moveTo(iconLeft + iconSize * 0.16f, iconTop + iconSize * 0.5f);
      iconPath.lineTo(iconLeft + iconSize * 0.86f, iconTop + iconSize * 0.18f);
      iconPath.lineTo(iconLeft + iconSize * 0.6f, iconTop + iconSize * 0.86f);
      iconPath.lineTo(iconLeft + iconSize * 0.46f, iconTop + iconSize * 0.58f);
      iconPath.close();
      canvas.drawPath(iconPath, iconPaint);
    }

    android.widget.ImageView imageView = new android.widget.ImageView(activity);
    imageView.setImageBitmap(bitmap);
    imageView.setAdjustViewBounds(true);
    return imageView;
  }

  private String ellipsizeText(String text, android.graphics.Paint paint, int maxWidth) {
    if (paint.measureText(text) <= maxWidth) {
      return text;
    }

    String ellipsis = "…";
    String candidate = text;
    while (candidate.length() > 1 && paint.measureText(candidate + ellipsis) > maxWidth) {
      candidate = candidate.substring(0, candidate.length() - 1);
    }
    return candidate.trim() + ellipsis;
  }

  private void hideAllInfoWindows() {
    for (Marker marker : markerMap.values()) {
      if (marker != null && marker.isInfoWindowShown()) {
        marker.hideInfoWindow();
      }
    }
  }

  private int dpToPx(int dp) {
    Activity activity = activitySupplier != null ? activitySupplier.get() : null;
    if (activity == null) {
      return dp;
    }

    return Math.round(
        android.util.TypedValue.applyDimension(
            android.util.TypedValue.COMPLEX_UNIT_DIP,
            dp,
            activity.getResources().getDisplayMetrics()));
  }

  private static class BubbleTailDrawable extends android.graphics.drawable.Drawable {
    private final android.graphics.Paint fillPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    private final android.graphics.Paint strokePaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    private final android.graphics.Path path = new android.graphics.Path();

    BubbleTailDrawable() {
      fillPaint.setColor(android.graphics.Color.WHITE);
      fillPaint.setStyle(android.graphics.Paint.Style.FILL);

      strokePaint.setColor(android.graphics.Color.rgb(235, 228, 224));
      strokePaint.setStyle(android.graphics.Paint.Style.STROKE);
      strokePaint.setStrokeWidth(2f);
      strokePaint.setStrokeJoin(android.graphics.Paint.Join.ROUND);
    }

    @Override
    public void draw(android.graphics.Canvas canvas) {
      android.graphics.Rect bounds = getBounds();
      path.reset();
      path.moveTo(bounds.width() / 2f, bounds.height());
      path.lineTo(1f, 1f);
      path.lineTo(bounds.width() - 1f, 1f);
      path.close();
      canvas.drawPath(path, fillPaint);
      canvas.drawPath(path, strokePaint);
    }

    @Override
    public void setAlpha(int alpha) {
      fillPaint.setAlpha(alpha);
      strokePaint.setAlpha(alpha);
    }

    @Override
    public void setColorFilter(android.graphics.ColorFilter colorFilter) {
      fillPaint.setColorFilter(colorFilter);
      strokePaint.setColorFilter(colorFilter);
    }

    @Override
    public int getOpacity() {
      return android.graphics.PixelFormat.TRANSLUCENT;
    }
  }

  private static class DirectionsIconDrawable extends android.graphics.drawable.Drawable {
    private final android.graphics.Paint paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    private final android.graphics.Path path = new android.graphics.Path();

    DirectionsIconDrawable() {
      paint.setColor(android.graphics.Color.rgb(122, 12, 24));
      paint.setStyle(android.graphics.Paint.Style.FILL);
    }

    @Override
    public void draw(android.graphics.Canvas canvas) {
      android.graphics.Rect bounds = getBounds();
      float width = bounds.width();
      float height = bounds.height();
      path.reset();
      path.moveTo(width * 0.16f, height * 0.5f);
      path.lineTo(width * 0.86f, height * 0.18f);
      path.lineTo(width * 0.6f, height * 0.86f);
      path.lineTo(width * 0.46f, height * 0.58f);
      path.close();
      canvas.drawPath(path, paint);
    }

    @Override
    public void setAlpha(int alpha) {
      paint.setAlpha(alpha);
    }

    @Override
    public void setColorFilter(android.graphics.ColorFilter colorFilter) {
      paint.setColorFilter(colorFilter);
    }

    @Override
    public int getOpacity() {
      return android.graphics.PixelFormat.TRANSLUCENT;
    }
  }

  private boolean isRawJsonStyle(String styleString) {
    if (styleString == null) {
      return false;
    }
    String trimmedStyle = styleString.trim();
    return trimmedStyle.startsWith("[") || trimmedStyle.startsWith("{");
  }

  private boolean isRemoteStyleUrl(String styleString) {
    if (styleString == null) {
      return false;
    }
    String trimmedStyle = styleString.trim().toLowerCase(java.util.Locale.US);
    return trimmedStyle.startsWith("http://") || trimmedStyle.startsWith("https://");
  }

  private String resolveMapStyle(String styleString) throws java.io.IOException {
    if (styleString == null || styleString.trim().isEmpty()) {
      return "";
    }

    if (isRawJsonStyle(styleString)) {
      return styleString;
    }

    if (isRemoteStyleUrl(styleString)) {
      return fetchJsonFromUrl(styleString);
    }

    android.util.Log.w("MapViewController", "Ignoring unsupported mapStyle value.");
    return "";
  }

  private BitmapDescriptor getBitmapDescriptorFromPath(String imagePath) {
    if (imagePath == null || imagePath.isEmpty()) {
      throw new IllegalArgumentException(JsErrors.INVALID_IMAGE_ERROR_MESSAGE);
    }

    java.io.File imageFile = new java.io.File(imagePath);
    if (imageFile.exists()) {
      return BitmapDescriptorFactory.fromPath(imagePath);
    }

    return BitmapDescriptorFactory.fromAsset(imagePath);
  }

`;

if (!patched.includes("private BitmapDescriptor getBitmapDescriptorFromPath")) {
  patched = patched.replace(
    "\n  /** Moves the position of the camera to the specified location. */",
    `\n${helper}  /** Moves the position of the camera to the specified location. */`,
  );
}

if (patched !== source) {
  fs.writeFileSync(controllerPath, patched);
  console.log("[patchNavigationSdk] Applied local marker/style compatibility patch.");
} else {
  console.log("[patchNavigationSdk] Patch already applied.");
}

const patchedFiles = [];
const recordPatch = (relativePath, patcher) => {
  const didPatch = patchFile(path.join(packageRoot, relativePath), patcher);
  if (didPatch) {
    patchedFiles.push(relativePath);
  }
};

recordPatch("src/native/NativeNavViewModule.ts", (text) => {
  let next = text;
  if (!next.includes("type ScreenPointSpec")) {
    next = next.replace(
      "type CameraPositionSpec = Readonly<{\n  target?: Readonly<{ lat: Float; lng: Float }> | null;\n  bearing?: WithDefault<Float, null>;\n  tilt?: WithDefault<Float, null>;\n  zoom?: WithDefault<Float, null>;\n}>;",
      "type CameraPositionSpec = Readonly<{\n  target?: Readonly<{ lat: Float; lng: Float }> | null;\n  bearing?: WithDefault<Float, null>;\n  tilt?: WithDefault<Float, null>;\n  zoom?: WithDefault<Float, null>;\n}>;\n\ntype ScreenPointSpec = Readonly<{\n  x: Float;\n  y: Float;\n}>;",
    );
  }
  if (!next.includes("pointForCoordinate(")) {
    next = next.replace(
      "  moveCamera(\n    nativeID: string,\n    cameraPosition: CameraPositionSpec\n  ): Promise<void>;",
      "  moveCamera(\n    nativeID: string,\n    cameraPosition: CameraPositionSpec\n  ): Promise<void>;\n  pointForCoordinate(\n    nativeID: string,\n    coordinate: Readonly<{ lat: Float; lng: Float }>\n  ): Promise<ScreenPointSpec | null>;",
    );
  }
  return next;
});

recordPatch("src/maps/mapView/mapViewController.ts", (text) =>
  text.includes("pointForCoordinate: async coordinate")
    ? text
    : text.replace(
        "    moveCamera: async (cameraPosition: CameraPosition) => {\n      return await NavViewModule.moveCamera(nativeID, cameraPosition);\n    },",
        "    moveCamera: async (cameraPosition: CameraPosition) => {\n      return await NavViewModule.moveCamera(nativeID, cameraPosition);\n    },\n\n    pointForCoordinate: async coordinate => {\n      return await NavViewModule.pointForCoordinate(nativeID, coordinate);\n    },",
      ),
);

recordPatch("src/maps/mapView/types.ts", (text) =>
  text.includes("pointForCoordinate(coordinate")
    ? text
    : text.replace(
        "  moveCamera(cameraPosition: CameraPosition): void;",
        "  moveCamera(cameraPosition: CameraPosition): void;\n\n  /**\n   * Projects a latitude/longitude into this map view's screen coordinate space.\n   */\n  pointForCoordinate(coordinate: LatLng): Promise<{ x: number; y: number } | null>;",
      ),
);

recordPatch("src/maps/types.ts", (text) =>
  text.includes("onMapGestureStarted")
    ? text
    : text.replace(
        "  readonly onMarkerInfoWindowTapped?: (marker: Marker) => void;",
        "  readonly onMarkerInfoWindowTapped?: (marker: Marker) => void;\n  readonly onMapGestureStarted?: () => void;",
      ),
);

recordPatch("src/native/NativeNavViewComponent.ts", (text) =>
  text.includes("onMapGestureStarted")
    ? text
    : text.replace(
        "  onMapClick?: DirectEventHandler<{ lat: Float; lng: Float }>;",
        "  onMapClick?: DirectEventHandler<{ lat: Float; lng: Float }>;\n  onMapGestureStarted?: DirectEventHandler<{}>;",
      ),
);

recordPatch("src/maps/mapView/mapView.tsx", (text) => {
  let next = text;
  if (!next.includes("const onMapGestureStarted")) {
    next = next.replace(
      "  const onMapClick = useNativeEventCallback(props.onMapClick);",
      "  const onMapClick = useNativeEventCallback(props.onMapClick);\n  const onMapGestureStarted = useNativeEventCallback(props.onMapGestureStarted);",
    );
  }
  if (!next.includes("onMapGestureStarted={onMapGestureStarted}")) {
    next = next.replace(
      "      onMapClick={onMapClick}",
      "      onMapClick={onMapClick}\n      onMapGestureStarted={onMapGestureStarted}",
    );
  }
  return next;
});

recordPatch("lib/typescript/src/native/NativeNavViewModule.d.ts", (text) => {
  let next = text;
  if (!next.includes("type ScreenPointSpec")) {
    next = next.replace(
      "type CameraPositionSpec = Readonly<{\n    target?: Readonly<{\n        lat: Float;\n        lng: Float;\n    }> | null;\n    bearing?: WithDefault<Float, null>;\n    tilt?: WithDefault<Float, null>;\n    zoom?: WithDefault<Float, null>;\n}>;",
      "type CameraPositionSpec = Readonly<{\n    target?: Readonly<{\n        lat: Float;\n        lng: Float;\n    }> | null;\n    bearing?: WithDefault<Float, null>;\n    tilt?: WithDefault<Float, null>;\n    zoom?: WithDefault<Float, null>;\n}>;\ntype ScreenPointSpec = Readonly<{\n    x: Float;\n    y: Float;\n}>;",
    );
  }
  if (!next.includes("pointForCoordinate(")) {
    next = next.replace(
      "    moveCamera(nativeID: string, cameraPosition: CameraPositionSpec): Promise<void>;",
      "    moveCamera(nativeID: string, cameraPosition: CameraPositionSpec): Promise<void>;\n    pointForCoordinate(nativeID: string, coordinate: Readonly<{\n        lat: Float;\n        lng: Float;\n    }>): Promise<ScreenPointSpec | null>;",
    );
  }
  return next;
});

recordPatch("lib/typescript/src/maps/mapView/types.d.ts", (text) =>
  text.includes("pointForCoordinate(coordinate")
    ? text
    : text.replace(
        "    moveCamera(cameraPosition: CameraPosition): void;",
        "    moveCamera(cameraPosition: CameraPosition): void;\n    /**\n     * Projects a latitude/longitude into this map view's screen coordinate space.\n     */\n    pointForCoordinate(coordinate: LatLng): Promise<{\n        x: number;\n        y: number;\n    } | null>;",
      ),
);

recordPatch("lib/typescript/src/maps/types.d.ts", (text) =>
  text.includes("onMapGestureStarted")
    ? text
    : text.replace(
        "    readonly onMarkerInfoWindowTapped?: (marker: Marker) => void;",
        "    readonly onMarkerInfoWindowTapped?: (marker: Marker) => void;\n    readonly onMapGestureStarted?: () => void;",
      ),
);

recordPatch("lib/typescript/src/native/NativeNavViewComponent.d.ts", (text) =>
  text.includes("onMapGestureStarted")
    ? text
    : text.replace(
        "    onMapClick?: DirectEventHandler<{\n        lat: Float;\n        lng: Float;\n    }>;",
        "    onMapClick?: DirectEventHandler<{\n        lat: Float;\n        lng: Float;\n    }>;\n    onMapGestureStarted?: DirectEventHandler<{}>;",
      ),
);

for (const controllerFile of [
  "lib/commonjs/maps/mapView/mapViewController.js",
  "lib/module/maps/mapView/mapViewController.js",
]) {
  recordPatch(controllerFile, (text) =>
    text.includes("pointForCoordinate: async coordinate")
      ? text
      : text.replace(
          "    moveCamera: async cameraPosition => {\n      return await NavViewModule.moveCamera(nativeID, cameraPosition);\n    },",
          "    moveCamera: async cameraPosition => {\n      return await NavViewModule.moveCamera(nativeID, cameraPosition);\n    },\n    pointForCoordinate: async coordinate => {\n      return await NavViewModule.pointForCoordinate(nativeID, coordinate);\n    },",
        ).replace(
          "    moveCamera: async cameraPosition => {\n      return await _NativeNavViewModule.default.moveCamera(nativeID, cameraPosition);\n    },",
          "    moveCamera: async cameraPosition => {\n      return await _NativeNavViewModule.default.moveCamera(nativeID, cameraPosition);\n    },\n    pointForCoordinate: async coordinate => {\n      return await _NativeNavViewModule.default.pointForCoordinate(nativeID, coordinate);\n    },",
        ),
  );
}

for (const mapViewFile of [
  "lib/commonjs/maps/mapView/mapView.js",
  "lib/module/maps/mapView/mapView.js",
]) {
  recordPatch(mapViewFile, (text) => {
    let next = text;
    if (!next.includes("onMapGestureStarted")) {
      next = next.replace(
        "  const onMapClick = (0, _shared.useNativeEventCallback)(props.onMapClick);",
        "  const onMapClick = (0, _shared.useNativeEventCallback)(props.onMapClick);\n  const onMapGestureStarted = (0, _shared.useNativeEventCallback)(props.onMapGestureStarted);",
      ).replace(
        "  const onMapClick = useNativeEventCallback(props.onMapClick);",
        "  const onMapClick = useNativeEventCallback(props.onMapClick);\n  const onMapGestureStarted = useNativeEventCallback(props.onMapGestureStarted);",
      );
      next = next.replace(
        "      onMapClick: onMapClick,",
        "      onMapClick: onMapClick,\n      onMapGestureStarted: onMapGestureStarted,",
      );
    }
    return next;
  });
}

recordPatch("android/src/main/java/com/google/android/react/navsdk/INavigationViewCallback.java", (text) =>
  text.includes("void onMapGestureStarted();")
    ? text
    : text.replace("  void onMapClick(LatLng latLng);\n}", "  void onMapClick(LatLng latLng);\n\n  void onMapGestureStarted();\n}"),
);

const addFragmentGestureMethod = (text) =>
  text.includes("public void onMapGestureStarted()")
    ? text
    : text.replace(
        "  public void onMapClick(LatLng latLng) {\n    emitEvent(\"onMapClick\", ObjectTranslationUtil.getMapFromLatLng(latLng));\n  }",
        "  public void onMapClick(LatLng latLng) {\n    emitEvent(\"onMapClick\", ObjectTranslationUtil.getMapFromLatLng(latLng));\n  }\n\n  @Override\n  public void onMapGestureStarted() {\n    emitEvent(\"onMapGestureStarted\", null);\n  }",
      );

recordPatch("android/src/main/java/com/google/android/react/navsdk/MapViewFragment.java", addFragmentGestureMethod);
recordPatch("android/src/main/java/com/google/android/react/navsdk/NavViewFragment.java", addFragmentGestureMethod);

recordPatch("android/src/main/java/com/google/android/react/navsdk/NavViewManager.java", (text) =>
  text.includes("onMapGestureStarted")
    ? text
    : text.replace(
        "                .put(\"onMapClick\", MapBuilder.of(\"registrationName\", \"onMapClick\"))",
        "                .put(\"onMapClick\", MapBuilder.of(\"registrationName\", \"onMapClick\"))\n                .put(\"onMapGestureStarted\", MapBuilder.of(\"registrationName\", \"onMapGestureStarted\"))",
      ),
);

recordPatch("android/src/main/java/com/google/android/react/navsdk/NavViewModule.java", (text) =>
  text.includes("void pointForCoordinate")
    ? text
    : text.replace(
        "  @Override\n  public void setFollowingPerspective(String nativeID, double perspective, final Promise promise) {",
        "  @Override\n  public void pointForCoordinate(String nativeID, ReadableMap coordinate, final Promise promise) {\n    UiThreadUtil.runOnUiThread(\n        () -> {\n          IMapViewFragment fragment = mNavViewManager.getFragmentByNativeId(nativeID);\n          if (fragment == null || fragment.getGoogleMap() == null) {\n            promise.reject(JsErrors.NO_MAP_ERROR_CODE, JsErrors.NO_MAP_ERROR_MESSAGE);\n            return;\n          }\n\n          if (coordinate == null || !coordinate.hasKey(\"lat\") || !coordinate.hasKey(\"lng\")) {\n            promise.resolve(null);\n            return;\n          }\n\n          android.graphics.Point point =\n              fragment\n                  .getGoogleMap()\n                  .getProjection()\n                  .toScreenLocation(\n                      new LatLng(coordinate.getDouble(\"lat\"), coordinate.getDouble(\"lng\")));\n          WritableMap map = Arguments.createMap();\n          map.putDouble(\"x\", point.x);\n          map.putDouble(\"y\", point.y);\n          promise.resolve(map);\n        });\n  }\n\n  @Override\n  public void setFollowingPerspective(String nativeID, double perspective, final Promise promise) {",
      ),
);

recordPatch("android/build/generated/source/codegen/java/com/google/maps/android/rn/navsdk/NativeNavViewModuleSpec.java", (text) =>
  text.includes("pointForCoordinate")
    ? text
    : text.replace(
        "  @ReactMethod\n  @DoNotStrip\n  public abstract void moveCamera(String nativeID, ReadableMap cameraPosition, Promise promise);",
        "  @ReactMethod\n  @DoNotStrip\n  public abstract void moveCamera(String nativeID, ReadableMap cameraPosition, Promise promise);\n\n  @ReactMethod\n  @DoNotStrip\n  public abstract void pointForCoordinate(String nativeID, ReadableMap coordinate, Promise promise);",
      ),
);

if (patchedFiles.length > 0) {
  console.log(`[patchNavigationSdk] Patched ${patchedFiles.length} bridge files.`);
}
