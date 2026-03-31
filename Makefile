# Connection Monitor Extension - Makefile

UUID = conn-mon@pavel.dev
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all install uninstall pack clean schemas help

all: schemas help

# Compile GSettings schemas
schemas:
	@echo "Compiling GSettings schemas..."
	glib-compile-schemas schemas/

# Install extension to local GNOME Shell extensions
install: schemas
	@echo "Installing Connection Monitor extension..."
	mkdir -p $(INSTALL_DIR)
	cp -r *.js *.json *.css $(INSTALL_DIR)/
	cp -r lib $(INSTALL_DIR)/
	cp -r ui $(INSTALL_DIR)/
	cp -r resources $(INSTALL_DIR)/
	cp -r schemas $(INSTALL_DIR)/
	@echo "Extension installed to: $(INSTALL_DIR)"
	@echo ""
	@echo "To enable the extension, run:"
	@echo "  gnome-extensions enable $(UUID)"
	@echo ""
	@echo "Then restart GNOME Shell (Alt+F2, 'r', Enter) or log out and back in."

# Uninstall extension
uninstall:
	@echo "Removing Connection Monitor extension..."
	rm -rf $(INSTALL_DIR)
	@echo "Extension removed."
	@echo ""
	@echo "To complete uninstallation:"
	@echo "  gnome-extensions disable $(UUID)"
	@echo "Then restart GNOME Shell."

# Package extension for extensions.gnome.org
pack: schemas
	@echo "Packaging extension..."
	@mkdir -p build
	@rm -f build/$(UUID).zip
	@zip -r build/$(UUID).zip \
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
		-x "build/*" \
		-x "Makefile"
	@echo "Package created: build/$(UUID).zip"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -f schemas/gschemas.compiled
	@echo "Clean complete."

# Enable extension
enable:
	@echo "Enabling extension..."
	gnome-extensions enable $(UUID)
	@echo "Extension enabled. Restart GNOME Shell to activate."

# Disable extension
disable:
	@echo "Disabling extension..."
	gnome-extensions disable $(UUID)
	@echo "Extension disabled."

# Show extension status
status:
	@echo "Extension Status:"
	@gnome-extensions list | grep -q $(UUID) && echo "  Installed: Yes" || echo "  Installed: No"
	@gnome-extensions list --enabled | grep -q $(UUID) && echo "  Enabled: Yes" || echo "  Enabled: No"

# Show logs
logs:
	@echo "Showing Connection Monitor logs (Ctrl+C to exit):"
	journalctl -f -o cat | grep -i "connmon"

# Show help
help:
	@echo "Connection Monitor Extension - Build Commands"
	@echo ""
	@echo "  make install    - Install extension to ~/.local/share/gnome-shell/extensions/"
	@echo "  make uninstall  - Remove extension from system"
	@echo "  make pack       - Create ZIP package for extensions.gnome.org"
	@echo "  make enable     - Enable the extension"
	@echo "  make disable    - Disable the extension"
	@echo "  make status     - Show extension installation status"
	@echo "  make logs       - Follow extension logs in journalctl"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make help       - Show this help message"
	@echo ""
	@echo "After installation, restart GNOME Shell (Alt+F2, 'r', Enter)"
