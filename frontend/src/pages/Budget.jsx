import AppLayout from '../components/AppLayout';
import { Title, Text } from '@mantine/core';

function Budget() {
  return (
    <AppLayout>
      <Title order={1}>Budget</Title>
      <Text mt="md">Welcome to your budget page!</Text>
    </AppLayout>
  );
}

export default Budget;
