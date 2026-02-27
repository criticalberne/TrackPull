"""Tests for README documentation completeness."""

import pytest
from pathlib import Path


class TestReadmeDocumentation:
    """Test that README contains required documentation sections."""

    @pytest.fixture
    def readme_path(self):
        """Get path to README.md file."""
        return Path(__file__).parent.parent / "README.md"

    @pytest.fixture
    def readme_content(self, readme_path):
        """Load README content."""
        return readme_path.read_text()

    def test_readme_exists(self, readme_path):
        """Test that README.md file exists."""
        assert readme_path.exists(), "README.md file not found"

    def test_has_installation_section(self, readme_content):
        """Test that README contains installation instructions."""
        assert (
            "Installation" in readme_content or "install" in readme_content.lower()
        ), "README missing Installation section"

    def test_has_unpacked_install_steps(self, readme_content):
        """Test that README contains unpacked install steps."""
        required_terms = [
            "chrome://extensions/",
            "Developer mode",
            "Load unpacked",
        ]
        for term in required_terms:
            assert term.lower() in readme_content.lower(), (
                f"README missing installation step: {term}"
            )

    def test_has_report_url_usage(self, readme_content):
        """Test that README contains report URL usage examples."""
        url_examples = ["?r=", "?a=", "ReportId="]
        found_any = False
        for example in url_examples:
            if example in readme_content:
                found_any = True
                break
        assert found_any, "README missing report URL parameter examples"

    def test_has_mp_parameter_documentation(self, readme_content):
        """Test that README documents mp[] parameter for column order."""
        assert "mp[]" in readme_content or "column order" in readme_content.lower(), (
            "README missing mp[] parameter documentation"
        )

    def test_has_sgos_parameter_documentation(self, readme_content):
        """Test that README documents sgos[] parameter for shot filtering."""
        assert "sgos[]" in readme_content or "shot group" in readme_content.lower(), (
            "README missing sgos[] parameter documentation"
        )

    def test_has_development_section(self, readme_content):
        """Test that README contains development instructions."""
        assert "Development" in readme_content or "build" in readme_content.lower(), (
            "README missing Development section"
        )

    def test_has_testing_section(self, readme_content):
        """Test that README contains testing instructions."""
        assert "Testing" in readme_content or "pytest" in readme_content.lower(), (
            "README missing Testing section"
        )


class TestReadmeUrlExamples:
    """Test specific URL examples in README."""

    @pytest.fixture
    def readme_content(self):
        """Load README content."""
        return Path(__file__).parent.parent / "README.md"

    def test_report_r_parameter_example(self, readme_content):
        """Test that ?r= parameter example is documented."""
        content = readme_content.read_text()
        assert "?r=" in content, "Missing ?r= URL parameter example"

    def test_activity_a_parameter_example(self, readme_content):
        """Test that ?a= parameter example is documented."""
        content = readme_content.read_text()
        assert "?a=" in content, "Missing ?a= URL parameter example"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
