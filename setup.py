#!/usr/bin/env python3
"""
C-It Setup Script
Automated setup script for the C-It algorithm visualizer project.
"""

import os
import sys
import subprocess
import secrets
from pathlib import Path

def print_banner():
    """Print the C-It setup banner."""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    C-It Setup Script                        ║
    ║              Interactive C Algorithm Visualizer              ║
    ╚══════════════════════════════════════════════════════════════╝
    """)

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 9):
        print("❌ Error: Python 3.9 or higher is required.")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def create_env_file():
    """Create .env file with default configuration."""
    env_content = f"""# C-It Environment Configuration
DEBUG=True
SECRET_KEY={secrets.token_urlsafe(50)}
DJANGO_SETTINGS_MODULE=c_it_project.settings

# Database (SQLite for development)
DATABASE_URL=sqlite:///db.sqlite3

# Static files
STATIC_URL=/static/
STATIC_ROOT=staticfiles/

# Security
SECURE_SSL_REDIRECT=False
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True
X_FRAME_OPTIONS=DENY
"""
    
    env_file = Path('.env')
    if env_file.exists():
        print("⚠️  .env file already exists. Skipping creation.")
        return
    
    with open('.env', 'w') as f:
        f.write(env_content)
    print("✅ Created .env file with default configuration")

def install_dependencies():
    """Install Python dependencies."""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        sys.exit(1)

def run_django_commands():
    """Run necessary Django commands."""
    commands = [
        ['python', 'manage.py', 'migrate'],
        ['python', 'manage.py', 'collectstatic', '--noinput'],
    ]
    
    for command in commands:
        print(f"🔄 Running: {' '.join(command)}")
        try:
            subprocess.run(command, check=True, capture_output=True)
            print(f"✅ {' '.join(command)} completed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error running {' '.join(command)}: {e}")
            sys.exit(1)

def create_superuser():
    """Create a superuser account."""
    print("\n👤 Create a superuser account (optional)")
    create_super = input("Would you like to create a superuser? (y/n): ").lower().strip()
    
    if create_super == 'y':
        try:
            subprocess.run(['python', 'manage.py', 'createsuperuser'], check=True)
            print("✅ Superuser created successfully")
        except subprocess.CalledProcessError:
            print("⚠️  Superuser creation cancelled or failed")

def print_next_steps():
    """Print next steps for the user."""
    print("""
    🎉 Setup completed successfully!
    
    📋 Next Steps:
    
    1. Start the development server:
       python manage.py runserver
    
    2. Open your browser and navigate to:
       http://localhost:8000
    
    3. For production deployment:
       - Read DEPLOYMENT.md for detailed instructions
       - Configure environment variables
       - Deploy to Vercel or your preferred platform
    
    📚 Documentation:
    - README.md: Project overview and usage
    - DEPLOYMENT.md: Deployment instructions
    - templates/: HTML templates
    - static/: Static files (CSS, JS)
    
    🔗 Links:
    - Portfolio: https://portfolio-john-jandayan.vercel.app
    - GitHub: https://github.com/yourusername/c-it
    
    🚀 Happy coding with C-It!
    """)

def main():
    """Main setup function."""
    print_banner()
    
    print("🔍 Checking prerequisites...")
    check_python_version()
    
    print("\n📁 Creating environment configuration...")
    create_env_file()
    
    print("\n📦 Installing dependencies...")
    install_dependencies()
    
    print("\n🔄 Running Django setup...")
    run_django_commands()
    
    print("\n👤 User setup...")
    create_superuser()
    
    print_next_steps()

if __name__ == '__main__':
    main() 