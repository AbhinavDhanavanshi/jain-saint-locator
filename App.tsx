// DEV ONLY: Paste this at the very top of App.tsx (remove when done)
if (__DEV__) {
  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    try {
      const msg = String(args[0] ?? "");
      if (msg.includes("Objects are not valid as a React child")) {
        origConsoleError("--- CONVERTED RENDER ERROR (will throw) ---");
        origConsoleError(...args);
        // pause in debugger if attached
        // eslint-disable-next-line no-debugger
        debugger;
        // throw so call stack shows exact source
        throw new Error("RenderObjectError: " + msg);
      }
    } catch (e) {
      // ignore and continue to original
    }
    origConsoleError(...args);
  };
}

import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
