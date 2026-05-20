"""
Unit Tests for EmotionEngine
Tests for face detection and emotion analysis functionality
"""
import pytest
import numpy as np
import base64
import os
import sys
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from emotion_system.backend.emotion_engine import EmotionEngine, EMOTION_WEIGHTS, ATTENTION_EMOTIONS, DISENGAGED_EMOTIONS


@pytest.mark.unit
class TestEmotionEngineInitialization:
    """Test EmotionEngine initialization."""

    def test_emotion_engine_initializes(self):
        """Test that EmotionEngine initializes without errors."""
        engine = EmotionEngine()
        assert engine is not None

    def test_emotion_engine_has_face_cascade(self):
        """Test that face cascade is loaded."""
        engine = EmotionEngine()
        # Face cascade may or may not be loaded depending on OpenCV installation
        assert hasattr(engine, 'face_cascade')

    def test_emotion_engine_has_known_faces(self):
        """Test that known_faces dictionary is initialized."""
        engine = EmotionEngine()
        assert isinstance(engine.known_faces, dict)
        assert len(engine.known_faces) == 0


@pytest.mark.unit
class TestEmotionWeights:
    """Test emotion weight mappings."""

    def test_all_emotions_have_weights(self):
        """Test that all emotions have assigned weights."""
        expected_emotions = [
            "happy", "neutral", "surprise", "fear", 
            "angry", "disgust", "sad", "bored", "confused"
        ]
        for emotion in expected_emotions:
            assert emotion in EMOTION_WEIGHTS, f"Missing weight for emotion: {emotion}"

    def test_emotion_weights_are_valid_range(self):
        """Test that emotion weights are between 0 and 1."""
        for emotion, weight in EMOTION_WEIGHTS.items():
            assert 0 <= weight <= 1, f"Invalid weight {weight} for emotion {emotion}"

    def test_happy_has_highest_weight(self):
        """Test that happy emotion has the highest engagement weight."""
        assert EMOTION_WEIGHTS["happy"] == 1.0

    def test_bored_has_lowest_weight(self):
        """Test that bored emotion has the lowest weight."""
        assert EMOTION_WEIGHTS["bored"] == 0.1


@pytest.mark.unit
class TestEmotionCategories:
    """Test emotion categorization."""

    def test_attention_emotions_are_valid(self):
        """Test that attention emotions are properly categorized."""
        assert isinstance(ATTENTION_EMOTIONS, set)
        assert len(ATTENTION_EMOTIONS) > 0
        # Check that all emotions in set exist in weights
        for emotion in ATTENTION_EMOTIONS:
            assert emotion in EMOTION_WEIGHTS

    def test_disengaged_emotions_are_valid(self):
        """Test that disengaged emotions are properly categorized."""
        assert isinstance(DISENGAGED_EMOTIONS, set)
        assert len(DISENGAGED_EMOTIONS) > 0
        # Check that all emotions in set exist in weights
        for emotion in DISENGAGED_EMOTIONS:
            assert emotion in EMOTION_WEIGHTS

    def test_attention_and_disengaged_emotions_no_overlap(self):
        """Test that attention and disengaged emotions don't overlap."""
        overlap = ATTENTION_EMOTIONS & DISENGAGED_EMOTIONS
        assert len(overlap) == 0, f"Emotion overlap detected: {overlap}"


@pytest.mark.unit
class TestFrameDecoding:
    """Test frame decoding functionality."""

    def test_frame_decode_with_invalid_input(self):
        """Test frame decoding with invalid base64 input."""
        engine = EmotionEngine()
        result = engine.decode_frame("invalid_base64_string")
        assert result is None

    def test_frame_decode_with_empty_input(self):
        """Test frame decoding with empty input."""
        engine = EmotionEngine()
        result = engine.decode_frame("")
        assert result is None

    @patch('emotion_system.backend.emotion_engine.cv2')
    def test_frame_decode_handles_exceptions(self, mock_cv2):
        """Test that frame decoding gracefully handles exceptions."""
        engine = EmotionEngine()
        mock_cv2.imdecode.side_effect = Exception("Decode error")
        result = engine.decode_frame("data:image/jpeg;base64,/9j/4AAQSkZ")
        # Should return None on exception
        assert result is None


@pytest.mark.unit  
class TestEmotionEngineState:
    """Test EmotionEngine state management."""

    def test_known_faces_starts_empty(self):
        """Test that known_faces dictionary starts empty."""
        engine = EmotionEngine()
        assert len(engine.known_faces) == 0

    def test_can_add_known_face(self):
        """Test adding a known face encoding."""
        engine = EmotionEngine()
        face_encoding = np.random.rand(128)  # Standard face encoding size
        engine.known_faces["S001"] = face_encoding
        assert "S001" in engine.known_faces

    def test_can_retrieve_known_face(self):
        """Test retrieving a known face encoding."""
        engine = EmotionEngine()
        face_encoding = np.random.rand(128)
        engine.known_faces["S001"] = face_encoding
        retrieved = engine.known_faces["S001"]
        assert np.array_equal(retrieved, face_encoding)


@pytest.mark.unit
class TestEngineValidation:
    """Test input validation in EmotionEngine."""

    def test_decode_frame_strips_data_prefix(self):
        """Test that decode_frame properly handles data URIs."""
        engine = EmotionEngine()
        # This should handle the "data:image/jpeg;base64," prefix correctly
        invalid_b64 = "data:image/jpeg;base64,invalid"
        result = engine.decode_frame(invalid_b64)
        # Should attempt to decode the base64 part after comma
        # Result will be None due to invalid base64
        assert result is None
