# Receipt & Warranty Manager

A local web-based application for managing receipts and item warranties with automatic file organization, integrity checking, and a modern green-themed UI.

## Features

### Core Functionality
- **Drag & Drop Receipt Upload** - Upload PDF, JPG, or PNG files up to 50MB
- **Multi-Item Support** - Handle single or multiple items per receipt
- **Smart File Organization** - Automatic file naming and directory structure
- **Guarantee Tracking** - Track warranty periods with expiration alerts
- **Search & Filter** - Find items by brand, model, project, user, or status
- **Data Export** - Export to JSON or CSV formats
- **Data Import** - Import previously exported JSON data
- **File Integrity Checking** - Automatic verification every 30 seconds + manual re-check
- **Auto-Backup** - Rolling backups (keeps last 20) on every save

### UI Features
- **System Theme Detection** - Automatic dark/light mode based on OS settings
- **Fresh Green Color Scheme** - Calming, nature-inspired design
- **Alternating Row Colors** - Enhanced readability
- **Sortable Columns** - Click headers to sort by any column
- **Column Visibility Toggles** - Show/hide columns as needed
- **Project Color Coding** - Visual differentiation of projects
- **Status Highlights** - Yellow for expiring soon (90 days), red for expired
- **Responsive Design** - Works on desktop and tablet

## Installation

### Prerequisites
- **Mac**: macOS 10.14+ with Python 3.8+
- **Linux**: Any modern distribution with Python 3.8+
- **Python 3.8 or higher** must be installed

### Quick Start

#### On Mac:
1. Extract the `receipt_manager` folder
2. Double-click `run.command`
3. Open browser to `http://127.0.0.1:5000`

#### On Linux:
1. Extract the `receipt_manager` folder
2. Open terminal in the folder
3. Run: `./run.sh`
4. Open browser to `http://127.0.0.1:5000`

### First-Time Setup

The startup script automatically:
1. Creates a Python virtual environment (`venv/`)
2. Installs Flask and dependencies
3. Starts the web server

**Note**: First launch may take 1-2 minutes to install dependencies.

## Usage Guide

### Adding Items

#### Step 1: Upload Receipt
1. **Drag & drop** a receipt file onto the drop zone, or **click to browse**
2. Fill in receipt-level fields:
   - **Shop**: Where you purchased (autocomplete suggests previous entries)
   - **Purchase Date**: Format `YYYY-MMM-DD` (e.g., `2026-Feb-15`)
   - **Documentation**: Receipt type (e.g., `Invoice`, `Warranty Card`)
   - **Quantity**: Number of items on this receipt
3. Click **Next: Item Details**

#### Step 2: Item Information
For each item (repeated `quantity` times):
1. **Brand**: Manufacturer name
2. **Model**: Product model number/name
3. **Location**: Where item is stored
4. **Users**: Tags for who uses it (type and press Enter, max 8)
5. **Project**: Project name or leave as `N/A`
6. **Guarantee Duration**: Number + unit (days/months/years)
7. Click **Add Item**

The app automatically:
- Generates unique Receipt Group ID (`RG-0001`, `RG-0002`, etc.)
- Creates properly organized file structure
- Calculates guarantee end dates
- Prevents duplicate filenames

### File Organization

#### Multi-Item Receipts (quantity > 1)
- Stored in: `_Receipts/`
- Filename: `Shop-PurchaseDate-Documentation-ReceiptGroupID.ext`
- Example: `IKEA-2026Feb15-Invoice-RG-0001.pdf`

#### Single-Item Receipts (quantity = 1)
- Stored in: `ProjectName/` or `BrandName/` (if project = N/A)
- Filename: `Brand-Model-PurchaseDate-Shop-Location-Users-Documentation.ext`
- Example: `Apple/Apple-iPhone15ProMax-2026Feb15-Coolblue-Home-John-Jane-Invoice.pdf`

**Filename Rules**:
- Invalid characters removed: `< > : " / \ | ? *`
- Spaces replaced with hyphens
- Truncated if exceeding safe length (with warning)
- Duplicate detection prevents overwrites

### Editing Items

1. Click **✏️ Edit** button on any row
2. Modify fields as needed
3. Click **Save Changes**

**What Happens on Edit**:
- Single-item receipts: File renamed/moved if brand/model/project/etc. changed
- Multi-item receipts: Receipt file stays in `_Receipts/`, item metadata updated
- If file operation fails, changes are rejected (atomic operation)
- Old directories cleaned up if empty

### Deleting Items

1. Click **🗑️ Delete** button on any row
2. Confirm deletion

**Deletion Behavior**:
- Deletes the underlying receipt file
- For multi-item receipts: File deleted only when **last** item referencing it is deleted
- Empty directories are automatically removed

### File Integrity

**Automatic Checks**:
- Runs on startup
- Runs every 30 seconds in background
- Verifies all referenced files exist

**When Files Go Missing**:
- Red **🔴** indicator appears in File column
- Row shown with strike-through
- Edit button disabled
- Red banner at top lists missing files
- Click **🔄 Re-check Files Now** to verify again

**Why This Matters**:
- Prevents editing items with missing receipts (could break data consistency)
- Alerts you immediately if files moved/deleted outside the app
- Maintains data integrity

### Search & Filters

**Search Box**: Type to filter by brand, model, location, project, shop, documentation, or users

**Filters**:
- **Projects**: Show items from specific project
- **Status**:
  - Active: Guarantee still valid
  - Expiring Soon: Within 90 days of expiration
  - Expired: Guarantee has ended
  - No Guarantee: Items with 0 duration
- **Users**: Show items tagged with specific user

**Sorting**: Click any column header to sort ascending/descending

### Column Visibility

Click **⚙️ Columns** button to show/hide:
- ID
- Receipt Group
- Brand, Model, Location
- Users, Project
- Shop, Purchase Date, Documentation
- Guarantee, End Date
- File

### Data Management

**Export JSON**:
- Complete backup of all data
- Includes receipts, items, and metadata
- Can be re-imported later

**Export CSV**:
- Flattened view of items with receipt info
- Opens in Excel, Google Sheets, etc.
- Good for reporting/analysis

**Import JSON**:
- Restore from previous export
- **Warning**: Replaces all current data
- Creates backup before import

## Data Storage

### Files
- `data/data.json` - Main database (JSON format)
- `data/backups/` - Rolling backups (last 20 saves)
- `_Receipts/` - Multi-item receipt files
- `ProjectName/` or `BrandName/` - Single-item receipt files

### Backup Strategy
- Automatic backup on every save
- Keeps last 20 backups with timestamps
- Format: `data_backup_YYYYMMDD_HHMMSS.json`
- Backups stored in `data/backups/`

### Data Format
```json
{
  "receipts": [
    {
      "receipt_group_id": "RG-0001",
      "shop": "Coolblue",
      "purchase_date": "2026-Feb-15",
      "documentation": "Invoice",
      "receipt_filename": "Coolblue-2026Feb15-Invoice-RG-0001.pdf",
      "receipt_relative_path": "_Receipts/Coolblue-2026Feb15-Invoice-RG-0001.pdf"
    }
  ],
  "items": [
    {
      "id": 1,
      "receipt_group_id": "RG-0001",
      "brand": "Apple",
      "model": "iPhone 15 Pro Max",
      "location": "Home",
      "users": ["John", "Jane"],
      "project": "N/A",
      "guarantee_duration": 24,
      "guarantee_unit": "months",
      "guarantee_end_date": "2028-Feb-28",
      "receipt_relative_path": "_Receipts/Coolblue-2026Feb15-Invoice-RG-0001.pdf"
    }
  ],
  "next_id": 2
}
```

## Technical Details

### Technology Stack
- **Backend**: Flask (Python web framework)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: JSON file (no database required)
- **File Handling**: Python pathlib + shutil

### System Requirements
- **CPU**: Any modern processor
- **RAM**: 256MB minimum
- **Disk**: 100MB for app + space for receipt files
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Port Configuration
- Default: `http://127.0.0.1:5000`
- Accessible only from local machine (not network-accessible)
- To change port: Edit `app.py` line 685: `app.run(host='127.0.0.1', port=5000)`

### File Upload Limits
- Maximum file size: 50MB
- Supported formats: PDF, JPG, JPEG, PNG
- To change limit: Edit `app.py` line 19: `app.config['MAX_CONTENT_LENGTH']`

## Troubleshooting

### "Python 3 is not installed"
**Mac**: Install from https://www.python.org/downloads/  
**Linux**: Use package manager:
- Ubuntu/Debian: `sudo apt install python3 python3-venv python3-pip`
- Fedora: `sudo dnf install python3 python3-pip`
- Arch: `sudo pacman -S python python-pip`

### "Permission denied" when running scripts
**Mac/Linux**: Make scripts executable:
```bash
chmod +x run.command run.sh
```

### "Address already in use"
Another application is using port 5000. Either:
1. Stop the other application
2. Change port in `app.py` (see Port Configuration above)

### Files not uploading
1. Check file size (max 50MB)
2. Verify format (PDF, JPG, PNG only)
3. Check available disk space
4. Look for error messages in terminal

### Integrity errors after moving files manually
If you move/rename files outside the app:
1. The integrity checker will detect missing files
2. You'll see red 🔴 indicators
3. Either:
   - Move files back to original locations
   - Delete affected items and re-upload

### App won't start
1. Check Python version: `python3 --version` (must be 3.8+)
2. Delete `venv/` folder and restart (forces fresh install)
3. Check terminal for error messages
4. Ensure no other app is using port 5000

## Keyboard Shortcuts

Currently, the app uses mouse interaction. Keyboard shortcuts can be added by extending `app.js`.

**Suggested shortcuts** (for future implementation):
- `Ctrl/Cmd + F` - Focus search box
- `Ctrl/Cmd + N` - New receipt upload
- `Ctrl/Cmd + E` - Export JSON
- `Ctrl/Cmd + R` - Refresh data
- `Escape` - Close dialogs

## Security & Privacy

### Local-Only Operation
- **No internet connection required** (after installation)
- **No data sent to external servers**
- All data stored locally on your machine

### Access Control
- Runs on `127.0.0.1` (localhost only)
- Not accessible from network/internet
- No authentication required (single-user design)

**Note**: This app is designed for **personal use** on a trusted machine. If you need multi-user access or network sharing, additional authentication layers would be needed.

## Folder Structure

```
receipt_manager/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── run.command            # Mac launcher
├── run.sh                 # Linux launcher
├── README.md              # This file
├── data/
│   ├── data.json         # Main database
│   └── backups/          # Auto-backups
├── _Receipts/            # Multi-item receipts
├── [ProjectNames]/       # Single-item receipts by project
├── [BrandNames]/         # Single-item receipts by brand (if no project)
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       └── app.js        # Frontend logic
├── templates/
│   └── index.html        # Main page
└── venv/                 # Virtual environment (created on first run)
```

## Advanced Configuration

### Guarantee End Date Calculation

**Days**: Simple addition  
**Months**: Adds months, keeps same day, uses last day of month if needed  
**Years**: Adds years, uses last day of target month

Example:
- Purchase: 2026-Feb-15
- Duration: 24 months
- End Date: **2028-Feb-28** (last day of February 2028)

### Autocomplete Suggestions

The app learns from your entries:
- Shops, brands, models, locations, documentation types, projects, and users
- Suggestions update after each new item
- Clear suggestions by importing a fresh JSON export

### Multi-Item vs Single-Item Logic

**System decides based on quantity**:
- Quantity > 1 → Multi-item (one file in `_Receipts/`)
- Quantity = 1 → Single-item (file in `ProjectName/` or `BrandName/`)

**Why this matters**:
- Multi-item: Efficient for bulk purchases (one receipt, many items)
- Single-item: Better organization for individual items (filed by project/brand)

## FAQ

**Q: Can I use this on Windows?**  
A: Not officially supported, but Flask runs on Windows. You'd need to:
1. Install Python 3 from python.org
2. Open Command Prompt in `receipt_manager/`
3. Run: `python -m venv venv`
4. Run: `venv\Scripts\activate`
5. Run: `pip install -r requirements.txt`
6. Run: `python app.py`

**Q: How do I move the app to another computer?**  
A: Copy the entire `receipt_manager/` folder. All data and files are self-contained.

**Q: Can multiple people use this simultaneously?**  
A: No, it's designed for single-user local use. For multi-user, you'd need to add authentication and run on a server.

**Q: What if I accidentally delete an item?**  
A: Check `data/backups/` for recent backups. Import the most recent one before deletion.

**Q: Can I customize colors/theme?**  
A: Yes! Edit `static/css/style.css`. Modify the `:root` variables for colors.

**Q: Does this work offline?**  
A: Yes! After initial installation, no internet connection needed.

**Q: How many items can it handle?**  
A: Tested with 10,000+ items. Performance depends on your computer. Search/filter may slow down with 50,000+ items.

**Q: Can I add custom fields?**  
A: Yes, but requires code changes to `app.py` (data model), `templates/index.html` (UI), and `static/js/app.js` (logic).

## License

This application is provided as-is for personal use. Free to modify and distribute.

## Support

For issues or questions:
1. Check this README thoroughly
2. Review error messages in terminal
3. Verify Python version and dependencies
4. Check file permissions and disk space

## Changelog

### Version 1.0 (February 2026)
- Initial release
- Core receipt and item management
- Automatic file organization
- Integrity checking
- Search, filter, sort functionality
- Dark/light theme support
- Export/import capabilities
- Rolling backups

---

**Enjoy managing your receipts and warranties! 📦✨**
