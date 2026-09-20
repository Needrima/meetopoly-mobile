import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiBaseUrl } from '@/api/client';
import { useHealth } from '@/hooks/useHealth';

export default function IndexScreen() {
  const { data, error, isFetching, isLoading, refetch, isError } = useHealth();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-3xl font-bold text-slate-900">Meetopoly</Text>
        <Text className="mb-8 text-center text-base text-slate-600">
          Phase 0 — health check against the Go API
        </Text>

        <View className="w-full rounded-2xl bg-white p-5" style={{ elevation: 1 }}>
          <Text className="mb-1 text-xs uppercase tracking-wide text-slate-400">API</Text>
          <Text className="mb-4 font-mono text-sm text-slate-700">{getApiBaseUrl()}</Text>

          {isLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator />
              <Text className="mt-2 text-slate-500">Calling /health…</Text>
            </View>
          ) : null}

          {isError ? (
            <Text className="text-base text-red-600">
              {error instanceof Error ? error.message : 'Request failed'}
            </Text>
          ) : null}

          {data ? (
            <View className="gap-2">
              <Text className="text-lg font-semibold text-slate-900">
                status: {data.status}
              </Text>
              <Text className="text-base text-slate-700">mongo: {data.mongo}</Text>
              <Text className="text-base text-slate-700">redis: {data.redis}</Text>
              {data.version ? (
                <Text className="text-sm text-slate-500">version: {data.version}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <Pressable
          className="mt-6 rounded-xl bg-slate-900 px-6 py-3 active:opacity-80"
          disabled={isFetching}
          onPress={() => {
            void refetch();
          }}
        >
          <Text className="text-base font-semibold text-white">
            {isFetching ? 'Refreshing…' : 'Refresh health'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
