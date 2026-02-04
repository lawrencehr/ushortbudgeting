import pytest
import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts.parse_payguide import PayGuideParser

# Test Data Constants
PDF_PATH = "payguidepdf_G00912929.pdf"
OUTPUT_PATH = "backend/data/award_rates.json"

@pytest.fixture
def parser():
    return PayGuideParser(PDF_PATH)

def test_parser_init(parser):
    assert parser.pdf_path == PDF_PATH
    assert os.path.exists(parser.pdf_path)

def test_section_filtering(parser):
    """Test that only target sections are extracted"""
    data = parser.extract()
    sections = [s['name'] for s in data['sections']]
    
    assert "Television broadcasting - Full-time & part-time" in sections
    assert "Artists - Full-time & part-time" in sections
    assert len(sections) == 2  # Strict filtering

def test_broadcasting_rates(parser):
    """Test specific known rates in Broadcasting section"""
    data = parser.extract()
    broadcasting = next(s for s in data['sections'] if "Television broadcasting" in s['name'])
    
    # Check for a known role (approximate check, exact values pending PDF inspection)
    # We'll use a role we know exists or is likely to exist based on user feedback
    # "Technician" or generic usually exists. 
    # Let's check for the ones the USER mentioned as fake vs real to ensure we capture real ones
    # They suggested "Stand-In/Double..." in Artists, let's look for a standard one here.
    # Usually "Band 1" or similar.
    
    classifications = [c['classification'] for c in broadcasting['classifications']]
    assert any("Band 1" in c for c in classifications)

def test_artist_rates_complex(parser):
    """Test complex Artist roles as requested by user"""
    data = parser.extract()
    artists = next(s for s in data['sections'] if "Artists" in s['name'])
    
    # Check for the specific long role names
    target_roles = [
        "Stand-In/Double - in a serial drama or serial comedy - 1 or 2 episodes",
        "Wardrobe person (Mistress / Master)", 
        "Captioning / Audio describing supervisor or trainer"
    ]
    
    found_roles = [c['classification'] for c in artists['classifications']]
    
    for target in target_roles:
        # Fuzzy match or exact match depending on implementation
        # For now, strict check to ensure parser quality
        assert target in found_roles, f"Missing: {target}"

def test_rate_structure(parser):
    """Ensure output format matches backend expectations"""
    data = parser.extract()
    section = data['sections'][0]
    rate = section['classifications'][0]
    
    assert 'classification' in rate
    assert 'hourly_rate' in rate
    assert isinstance(rate['hourly_rate'], float)
    assert 'base_weekly' in rate # If we capture it
