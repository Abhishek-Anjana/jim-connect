import { ReactNode, useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from "react-native";

type RemoteImageProps = {
  accessibilityLabel: string;
  fallbackIcon?: ReactNode;
  fallbackText: string;
  style: StyleProp<ImageStyle>;
  uri: string;
};

export function RemoteImage({
  accessibilityLabel,
  fallbackIcon,
  fallbackText,
  style,
  uri
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={[styles.fallback, style]}>
        {fallbackIcon}
        <Text numberOfLines={2} style={styles.fallbackText}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(true)}
      source={{ uri }}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "#eaf4ef",
    justifyContent: "center",
    overflow: "hidden",
    padding: 14
  },
  fallbackText: {
    color: "#0f6b57",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center"
  }
});
