import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { colors } from './theme/colors'
import './index.css'
import App from './App.jsx'

// Export queryClient so it can be used outside React components (e.g., in api.js)
export const queryClient = new QueryClient()

// Mantine theme with custom Radix Colors
const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  colors: {
    // Custom colors from our theme
    blue: [
      colors.blue1, colors.blue2, colors.blue3, colors.blue4, colors.blue5,
      colors.blue6, colors.blue7, colors.blue8, colors.blue9, colors.blue10,
      colors.blue11, colors.blue12,
    ],
    gray: [
      colors.gray1, colors.gray2, colors.gray3, colors.gray4, colors.gray5,
      colors.gray6, colors.gray7, colors.gray8, colors.gray9, colors.gray10,
      colors.gray11, colors.gray12,
    ],
    green: [
      colors.green1, colors.green2, colors.green3, colors.green4, colors.green5,
      colors.green6, colors.green7, colors.green8, colors.green9, colors.green10,
      colors.green11, colors.green12,
    ],
    red: [
      colors.red1, colors.red2, colors.red3, colors.red4, colors.red5,
      colors.red6, colors.red7, colors.red8, colors.red9, colors.red10,
      colors.red11, colors.red12,
    ],
    yellow: [
      colors.yellow1, colors.yellow2, colors.yellow3, colors.yellow4, colors.yellow5,
      colors.yellow6, colors.yellow7, colors.yellow8, colors.yellow9, colors.yellow10,
      colors.yellow11, colors.yellow12,
    ],
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
)
