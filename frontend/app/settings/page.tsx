'use client';

import { useEffect, useState } from "react";
import axios from "@/lib/utils/axios";
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Modal,
  Fade,
  IconButton
} from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

interface ConfigValue {
  value: string | number | boolean;
  description: string;
  updated_at: string;
}

interface Settings {
  [key: string]: ConfigValue;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  const [modalOpen, setModalOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({
    config_key: '',
    config_value: '',
    description: '',
  });

  const handleModalOpen = () => setModalOpen(true);
  const handleModalClose = () => {
    setModalOpen(false);
    setNewConfig({ config_key: '', config_value: '', description: '' });
  };
  useEffect(() => {
    getData();
  }, []);

  const getData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/config');
      setSettings(res.data);
      
      // Initialize form data with current values
      const initialData: Record<string, any> = {};
      Object.keys(res.data).forEach((key) => {
        initialData[key] = String(res.data[key].value);
      });
      setFormData(initialData);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setSaving(true);
      
      await axios.put('/api/config/batch', { configs: formData });
      setSuccess('Settings updated successfully!');
      getData(); // Refresh data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNewConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newConfig.config_key || !newConfig.config_value) {
      setError('Config key and value are required');
      return;
    }

    try {
      setSaving(true);
      await axios.put('/api/config', newConfig);
      setSuccess('New configuration added successfully!');
      handleModalClose();
      getData(); // Refresh data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-6 max-w-4xl mx-auto">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              System Configuration
            </Typography>
          </Box>
          <Button
            variant="contained"
            // startIcon={<AddIcon />}
            onClick={handleModalOpen}
            // sx={{
            //   transition: 'all 0.3s ease',
            //   '&:hover': {
            //     transform: 'scale(1.05)',
            //   },
            // }}
          >
            Add Config
          </Button>
          {/* <button className="text-black hover:bg-amber-200">add button</button> */}
        </Box>

        <Divider sx={{ mb: 4 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {settings && Object.keys(settings).map((key) => {
              const config = settings[key];
              const isBoolean = typeof config.value === 'boolean';
              
              return (
                <Box  key={key}>
                  {isBoolean ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData[key] === true}
                          onChange={(e) => handleInputChange(key, e.target.checked)}
                          name={key}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {config.description}
                          </Typography>
                        </Box>
                      }
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        p: 2,
                        m: 0,
                        width: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        },
                      }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label={key.replace(/_/g, ' ').toUpperCase()}
                      name={key}
                      type={typeof config.value === 'number' ? 'number' : 'text'}
                      value={formData[key] ?? ''}
                      onChange={(e) => handleInputChange(key, typeof config.value === 'number' ? Number(e.target.value) : e.target.value)}
                      helperText={config.description}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={getData}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={saving}
              sx={{
                minWidth: 150,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>

        {settings && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date(Object.values(settings)[0]?.updated_at).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Total settings: {Object.keys(settings).length}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add Config Modal */}
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        closeAfterTransition
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={modalOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                Add New Configuration
              </Typography>
              <IconButton onClick={handleModalClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleAddConfig}>
              <TextField
                fullWidth
                label="Config Key"
                name="config_key"
                value={newConfig.config_key}
                onChange={handleNewConfigChange}
                required
                sx={{ mb: 2 }}
                placeholder="new_setting"
                helperText="Use lowercase with underscores (e.g., max_files)"
              />

              <TextField
                fullWidth
                label="Config Value"
                name="config_value"
                value={newConfig.config_value}
                onChange={handleNewConfigChange}
                required
                sx={{ mb: 2 }}
                placeholder="100"
                helperText="The value for this configuration"
              />

              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newConfig.description}
                onChange={handleNewConfigChange}
                multiline
                rows={3}
                sx={{ mb: 3 }}
                placeholder="Description of the setting"
                helperText="Optional: A brief description of what this setting does"
              />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  onClick={handleModalClose} 
                  variant="outlined"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={saving}
                  sx={{
                    minWidth: 120,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  {saving ? <CircularProgress size={24} /> : 'Add Config'}
                </Button>
              </Box>
            </form>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}