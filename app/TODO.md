- [ ] Move the backend working into this repo
- [ ] Backend worker should serve app
- [ ] Fix the deploy to a unique worker and URL
- [ ] Handle read only / write / new
    - Clone a read only (can't modify, only in read only)
    - Start a new fresh spreadsheet
- [ ] Fix sharing button to handle read only and read write
- [ ] Update footer to reveal new world of saving on the backend

## Recent Changes
- [x] **UI Improvement**: Transformed existing shareholders from card-based layout to table/spreadsheet format
  - Changed from individual gray cards to clean table with rows
  - Implemented cell-based color coding: white background for editable cells, gray for non-editable
  - Added inline editing with click-to-edit functionality
  - Maintained keyboard navigation (Enter to save, Escape to cancel)
  - Preserved special handling for "Issued Options" and "Unused Options Pool" rows
  - Added totals row showing sum of shares and ownership percentage
  - Improved visual clarity and professional appearance
