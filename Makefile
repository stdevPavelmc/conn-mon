# Network Connection Quality Monitor - Makefile
# Short name: conn-mon
# Author: stdevPavelmc
# Repository: https://github.com/stdevPavelmc/conn-mon

UUID = conn-mon@stdevpavelmc.github.com
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
BUILD_DIR = build

.PHONY: all install uninstall pack clean schemas help enable disable status logs

all: schemas help

# Compile GSettings schemas
schemas:
	@echo "Compiling GSettings schemas..."
	glib-compile-schemas schemas/

# Install extension to local GNOME Shell extensions
install: schemas
	@echo "Installing Network Connection Quality Monitor extension..."
	mkdir -p $(INSTALL_DIR)
	cp -r *.js *.json *.css $(INSTALL_DIR)/
	cp -r lib $(INSTALL_DIR)/
	cp -r ui $(INSTALL_DIR)/
	cp -r resources $(INSTALL_DIR)/
	cp -r schemas $(INSTALL_DIR)/
	@echo "Extension installed to: $(INSTALL_DIR)"
	@echo ""
	@echo "To enable the extension, run:"
	@echo "  make enable"
	@echo "  OR"
	@echo "  gnome-extensions enable $(UUID)"
	@echo ""
	@echo "Then restart GNOME Shell (Alt+F2, 'r', Enter on X11) or log out and back in on Wayland."

# Uninstall extension
uninstall:
	@echo "Removing Network Connection Quality Monitor extension..."
	rm -rf $(INSTALL_DIR)
	@echo "Extension removed."
	@echo ""
	@echo "To complete uninstallation, run:"
	@echo "  make disable"
	@echo "  OR"
	@echo "  gnome-extensions disable $(UUID)"
	@echo "Then restart GNOME Shell."

# Package extension for extensions.gnome.org
pack: schemas
	@echo "Packaging extension..."
	@mkdir -p $(BUILD_DIR)
	@rm -f $(BUILD_DIR)/$(UUID).zip
	@zip -r $(BUILD_DIR)/$(UUID).zip \
		*.js \
		*.json \
		*.css \
		README.md \
		LICENSE \
		lib/ \
		ui/ \
		resources/ \
		schemas/ \
		-x "*.git*" \
		-x "$(BUILD_DIR)/*" \
		-x "Makefile"
	@echo "Package created: $(BUILD_DIR)/$(UUID).zip"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)/
	rm -f schemas/gschemas.compiled
	@echo "Clean complete."

# Enable extension
enable:
	@echo "Enabling Network Connection Quality Monitor extension..."
	gnome-extensions enable $(UUID)
	@echo "Extension enabled. Restart GNOME Shell to activate."

# Disable extension
disable:
	@echo "Disabling Network Connection Quality Monitor extension..."
	gnome-extensions disable $(UUID)
	@echo "Extension disabled."

# Show extension status
status:
	@echo "Extension Status:"
	@gnome-extensions list | grep -q $(UUID) && echo "  Installed: Yes" || echo "  Installed: No"
	@gnome-extensions list --enabled | grep -q $(UUID) && echo "  Enabled: Yes" || echo "  Enabled: No"

# Show logs
logs:
	@echo "Showing Network Connection Quality Monitor logs (Ctrl+C to exit):"
	journalctl -f -o cat | grep -i "ConnMon"

# Show help
help:
	@echo "Network Connection Quality Monitor (conn-mon) - Build Commands"
	@echo ""
	@echo "Installation & Management:"
	@echo "  make install    - Install extension to ~/.local/share/gnome-shell/extensions/"
	@echo "  make uninstall  - Remove extension from system"
	@echo "  make enable     - Enable the extension"
	@echo "  make disable    - Disable the extension"
	@echo "  make status     - Show extension installation and enabled status"
	@echo ""
	@echo "Building & Packaging:"
	@echo "  make pack       - Create ZIP package for extensions.gnome.org upload"
	@echo "  make schemas    - Compile GSettings schemas"
	@echo "  make clean      - Remove build artifacts and compiled schemas"
	@echo ""
	@echo "Debugging:"
	@echo "  make logs       - Follow extension logs in journalctl (Ctrl+C to exit)"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install && make enable"
	@echo ""
	@echo "After installation, restart GNOME Shell:"
	@echo "  - X11: Alt+F2, type 'r', press Enter"
	@echo "  - Wayland: Log out and log back in"
