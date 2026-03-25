'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HistoryIcon from '@mui/icons-material/History';
import axiosInstance from '@/lib/utils/axios';

interface CarCount {
  id: number;
  stream_id: number;
  car_count: number;
  detections: string;
  created_at: string;
}

interface AICountStats {
  totalCounts: number;
  avgCount: number;
  maxCount: number;
  minCount: number;
  lastCount: number;
  recentCounts: CarCount[];
}

interface Props {
  streamId: number;
  streamName?: string;
}

export default function AICountDisplay({ streamId, streamName = 'Stream' }: Props) {
  const [stats, setStats] = useState<AICountStats | null>(null);
  const [recentCounts, setRecentCounts] = useState<CarCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchCountStats();
    // Refresh every 10 seconds
    const interval = setInterval(fetchCountStats, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  const fetchCountStats = async () => {
    try {
      const response = await axiosInstance.get(`/api/ai/stats/${streamId}?limit=20`);
      if (response.data.success) {
        const data = response.data.data;
        setStats({
          totalCounts: data.totalCounts,
          avgCount: data.avgCount,
          maxCount: data.maxCount,
          minCount: data.minCount,
          lastCount: data.lastCount,
          recentCounts: data.recentCounts || [],
        });
        setRecentCounts(data.recentCounts || []);
        setLastUpdated(new Date().toLocaleTimeString());
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader title="🚗 AI Car Counting Results" />
        <CardContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader title="🚗 AI Car Counting Results" />
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!stats || recentCounts.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader title="🚗 AI Car Counting Results" />
        <CardContent>
          <Alert severity="info">No counting data available. Start AI job to begin counting.</Alert>
        </CardContent>
      </Card>
    );
  }

  const trend = recentCounts.length > 1 
    ? recentCounts[0].car_count >= recentCounts[1].car_count 
      ? 'up' 
      : 'down'
    : 'stable';

  return (
    <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardHeader
        title="🚗 AI Car Counting Results"
        subheader={`Last updated: ${lastUpdated}`}
        action={
          <Chip
            icon={<HistoryIcon />}
            label="Live"
            color="success"
            variant="outlined"
            size="small"
          />
        }
      />
      <CardContent>
        {/* Statistics Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Current Count */}
          <Box>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                backgroundColor: '#e3f2fd',
                border: '2px solid #1976d2',
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                <DirectionsCarIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Current
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {stats.lastCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                cars detected
              </Typography>
            </Paper>
          </Box>

          {/* Average Count */}
          <Box >
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f3e5f5' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                Average
              </Typography>
              <Typography variant="h5" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                {stats.avgCount.toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                across {recentCounts.length} readings
              </Typography>
            </Paper>
          </Box>

          {/* Max Count */}
          <Box >
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={1}>
                <TrendingUpIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Peak
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                {stats.maxCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                highest count
              </Typography>
            </Paper>
          </Box>

          {/* Min Count */}
          <Box >
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={1}>
                <TrendingDownIcon sx={{ color: '#388e3c', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Low
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#388e3c', fontWeight: 'bold' }}>
                {stats.minCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                lowest count
              </Typography>
            </Paper>
          </Box>
        </Grid>

        {/* Trend Indicator */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#fff9c4', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Current Trend: {trend === 'up' ? '📈 Increasing' : trend === 'down' ? '📉 Decreasing' : '➡️ Stable'}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min((stats.lastCount / stats.maxCount) * 100, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: trend === 'up' ? '#f57c00' : '#388e3c',
              },
            }}
          />
        </Box>

        {/* Recent Counts Table */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          📊 Recent Counts (Last {recentCounts.length})
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  #
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  🚗 Count
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  📍 Detections
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ⏰ Time
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentCounts.map((count, index) => {
                try {
                  const detections = JSON.parse(count.detections || '[]');
                  const detectionCount = Array.isArray(detections) ? detections.length : 0;
                  return (
                    <TableRow key={count.id} hover>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<DirectionsCarIcon />}
                          label={count.car_count}
                          color={count.car_count > stats.avgCount ? 'warning' : 'default'}
                          variant={count.car_count === stats.maxCount ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={detectionCount}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.85rem', color: '#666' }}>
                        {new Date(count.created_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  );
                } catch (e) {
                  return (
                    <TableRow key={count.id} hover>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">
                        <Chip label={count.car_count} icon={<DirectionsCarIcon />} />
                      </TableCell>
                      <TableCell align="center">-</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.85rem', color: '#666' }}>
                        {new Date(count.created_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  );
                }
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Stats */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Box >
              <Typography variant="caption" sx={{ color: '#666' }}>
                Total Records
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {recentCounts.length}
              </Typography>
            </Box>
            <Box >
              <Typography variant="caption" sx={{ color: '#666' }}>
                Sum of Counts
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {stats.totalCounts}
              </Typography>
            </Box>
            <Box >
              <Typography variant="caption" sx={{ color: '#666' }}>
                Range
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {stats.maxCount - stats.minCount}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Variance
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {(stats.maxCount > 0 ? ((stats.maxCount - stats.minCount) / stats.maxCount * 100).toFixed(0) : 0)}%
              </Typography>
            </Box>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
