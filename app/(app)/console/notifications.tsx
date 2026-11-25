import React from "react";
import { Redirect } from "expo-router";
export default function LegacyNotifications() {
  return <Redirect href={"/(app)/notifications" as any} />;
}
