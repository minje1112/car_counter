"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SummarizeIcon from "@mui/icons-material/Summarize";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import axiosInstance from "@/lib/utils/axios";

interface Stats {
  total: number;
  average: number;
  max: number;
  min: number;
  records: number;
}

interface AICountData {
  streamId?: number | string;
  streamName?: string;
  aiStartedAt?: string | null;
  statistics?: Stats;
}

type Props = { streamId: number | string };

function AnimatedNumber({ value, decimals = 0, duration = 600 }: { value: number; decimals?: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (displayValue === value) return;

    const startValue = displayValue;
    const difference = value - startValue;
    const steps = duration / 16; // ~60fps
    const increment = difference / steps;
    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const newValue = startValue + difference * easeProgress;

      setDisplayValue(decimals > 0 ? parseFloat(newValue.toFixed(decimals)) : Math.round(newValue));

      if (currentStep < steps) {
        animationRef.current = setTimeout(animate, 16);
      } else {
        setDisplayValue(value);
      }
    };

    animate();

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current as ReturnType<typeof setTimeout>);
    };
  }, [value, decimals, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString?.();
  return <span>{formatted}</span>;
}

export default function AICountStats({ streamId }: Props) {
  const [data, setData] = useState<AICountData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await axiosInstance.get(`/api/ai/streams/${streamId}/stats?limit=10000`);
      const payload = res?.data ?? null;
      if (!payload) {
        setError("No statistics available");
        setData(null);
        return;
      }
      setData(payload as AICountData);
      setIsUpdating(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to load statistics");
      setData(null);
      setIsUpdating(false);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(() => {
      setIsUpdating(true);
      fetchStats();
    }, 30000);
    return () => clearInterval(id);
  }, [streamId]);

  if (initialLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Loading statistics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 1, py: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="warning" sx={{ mb: 1, py: 1 }}>
        No statistics available
      </Alert>
    );
  }

  const stats: Stats = data.statistics ?? { total: 0, average: 0, max: 0, min: 0, records: 0 };
  const startedAt = data.aiStartedAt ? new Date(data.aiStartedAt) : null;

  return (
    <Box sx={{ mb: 2, gap:2, flexDirection:'column', display:'flex' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
        <SummarizeIcon sx={{ fontSize: 16 }} />
        Count Statistics
      </Typography>

            <Box sx={{ }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 12, color: "#7b1fa2" }} />
                <Typography variant="caption" sx={{ fontWeight: "700", color: "#7b1fa2" }}>
                    Job Started
                </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontSize:12, fontWeight: 600,  }}>
                {startedAt ? startedAt.toLocaleString() : "Unknown"}
                </Typography>
            </Box>

          <Box sx={{  }}>
            <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
              <DirectionsCarIcon sx={{ fontSize: 18, color: "#1976d2" }} />
              <Typography variant="caption" sx={{ fontWeight: "700", fontSize: 12, color: "#1976d2" }}>
                Total
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ color: "#1976d2",fontSize: 12, fontWeight: 800, lineHeight: 1, transition: 'all 0.6s ease' }}>
              <AnimatedNumber value={stats.total} duration={600} /> cars counted
            </Typography>
          </Box>
        

          <Box sx={{ }}>
            <Typography variant="caption" sx={{ fontWeight: "700",fontSize: 12, color: "#388e3c" }}>
              Average
            </Typography>
            <Typography variant="h5" sx={{ color: "#388e3c",fontSize: 12, fontWeight: 700, transition: 'all 0.6s ease' }}>
              <AnimatedNumber value={stats.average} decimals={2} duration={600} /> per count
            </Typography>
            
          </Box>
        
          <Box sx={{ }}>
            <Typography variant="caption" sx={{ fontWeight: "700",fontSize: 12, color: "#f57c00" }}>
              Peak
            </Typography>
            <Typography variant="h5" sx={{ color: "#f57c00",fontSize: 12, fontWeight: 700, transition: 'all 0.6s ease' }}>
              <AnimatedNumber value={stats.max} duration={600} /> highest count
            </Typography>
          </Box>
        
          <Box sx={{}}>
            <Typography variant="caption" sx={{ fontWeight: "700",fontSize: 12, color: "#c2185b" }}>
              Records
            </Typography>
            <Typography  sx={{ color: "#c2185b",fontSize:14 , fontWeight: 800, mt: 0.5, transition: 'all 0.6s ease' }}>
              <AnimatedNumber value={stats.records} duration={600} />
            </Typography>
          </Box>
        
    </Box>
  );
}
