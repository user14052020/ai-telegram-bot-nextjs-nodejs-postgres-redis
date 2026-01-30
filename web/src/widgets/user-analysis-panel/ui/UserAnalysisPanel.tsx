'use client';

import {
  Alert,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import type { FormEvent } from 'react';
import { useUserAnalysis } from '@/features/user-analysis/model/use-user-analysis';

export const UserAnalysisPanel = () => {
  const { username, setUsername, result, error, loading, analyze } = useUserAnalysis();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void analyze();
  };

  return (
    <main className="page">
      <Container size="sm" w="100%">
        <Paper className="panel" radius="lg" p="xl" shadow="md">
          <Stack gap="lg">
            <header className="header">
              <p className="eyebrow">Chat Intelligence</p>
              <Title order={1}>Анализ пользователей чата</Title>
              <Text className="subtitle">
                Введите @username, чтобы получить краткий разбор стиля общения, тем и активности.
              </Text>
            </header>

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Username"
                  placeholder="@john_doe"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
                <Button type="submit" loading={loading} size="md">
                  Анализировать
                </Button>
              </Stack>
            </form>

            {error && (
              <Alert color="red" title="Ошибка">
                {error}
              </Alert>
            )}

            {result && (
              <section className="result">
                <Group className="result-header" justify="space-between" align="center" wrap="wrap">
                  <Title order={3}>Анализ пользователя {result.displayName}</Title>
                  <Badge color="teal" variant="light">
                    {result.messageCount} сообщений · {result.lookbackDays} дней
                  </Badge>
                </Group>
                <Divider />
                <Text component="pre">{result.analysis}</Text>
              </section>
            )}
          </Stack>
        </Paper>
        <Text className="footer" ta="center">
          Telegram Analytics · Gemini API
        </Text>
      </Container>
    </main>
  );
};
