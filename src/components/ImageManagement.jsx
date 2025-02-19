import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    Grid,
    CircularProgress,
} from '@mui/material';
import { storage } from '../firebase';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';

export default function ImageManagement() {
    const [files, setFiles] = useState([]);
    const [location, setLocation] = useState('');
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState([]);

    useEffect(() => {
        if (location) {
            loadImages();
        }
    }, [location]);

    const loadImages = async () => {
        try {
            const storageRef = ref(storage, location);
            const result = await listAll(storageRef);
            
            const urls = await Promise.all(
                result.items.map(async (item) => ({
                    name: item.name,
                    url: await getDownloadURL(item)
                }))
            );
            
            setImages(urls);
        } catch (error) {
            console.error('Error loading images:', error);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!files.length || !location) {
            alert('Please select files and location');
            return;
        }

        setUploading(true);
        try {
            for (let file of files) {
                const storageRef = ref(storage, `${location}/${file.name}`);
                await uploadBytes(storageRef, file);
            }
            await loadImages();
            setFiles([]);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        }
        setUploading(false);
    };

    const handleDelete = async (imageName) => {
        if (!window.confirm('Are you sure you want to delete this image?')) return;

        try {
            const imageRef = ref(storage, `${location}/${imageName}`);
            await deleteObject(imageRef);
            await loadImages();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed: ' + error.message);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Image Management
            </Typography>
            
            <form onSubmit={handleUpload}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Location</InputLabel>
                            <Select
                                value={location}
                                label="Location"
                                onChange={(e) => setLocation(e.target.value)}
                            >
                                <MenuItem value="slider">Home Slider</MenuItem>
                                <MenuItem value="gallery">Gallery</MenuItem>
                                <MenuItem value="facilities">Facilities</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            variant="contained"
                            component="label"
                            fullWidth
                        >
                            Select Images
                            <input
                                type="file"
                                hidden
                                multiple
                                accept="image/*"
                                onChange={(e) => setFiles(Array.from(e.target.files))}
                            />
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={uploading}
                        >
                            {uploading ? <CircularProgress size={24} /> : 'Upload'}
                        </Button>
                    </Grid>
                </Grid>
            </form>

            <Grid container spacing={2} sx={{ mt: 4 }}>
                {images.map((image) => (
                    <Grid item xs={12} sm={6} md={4} key={image.name}>
                        <Box sx={{ position: 'relative' }}>
                            <img
                                src={image.url}
                                alt={image.name}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                }}
                            />
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleDelete(image.name)}
                                sx={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                }}
                            >
                                Delete
                            </Button>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
} 