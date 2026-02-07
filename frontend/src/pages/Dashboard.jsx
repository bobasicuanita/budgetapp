import AppLayout from '../components/AppLayout';
import { Title, Text } from '@mantine/core';

function Dashboard() {
  return (
    <AppLayout>
      <Title order={1}>Dashboard</Title>
      <Text mt="md">Welcome to your budget dashboard!</Text>
    </AppLayout>
  );
}

export default Dashboard;
