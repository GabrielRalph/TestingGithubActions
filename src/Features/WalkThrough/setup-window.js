import { OccupiableWindow } from "../features-interface.js";
import { GridIcon, GridLayout } from "../../Utilities/Buttons/grid-icon.js";
import { relURL } from "../../Utilities/usefull-funcs.js";
import { MaskOverlay } from "./mask-overlay.js";
import { AccessButton, AccessEvent } from "../../Utilities/Buttons/access-buttons.js";
import { SvgPlus } from "../../SvgPlus/4.js";

class ProfileCard extends GridIcon {
    constructor(profile) {
        super({
            displayValue: profile.name,
            symbol: "person",
            type: "lightPurple",
            class: "profile-card",
            events: {
                "access-click": (e) => {
                    e.stopPropagation();
                    this.dispatchEvent(new CustomEvent('profile-selected', {
                        bubbles: true,
                        detail: { profile: profile, card: this }
                    }));
                }
            }
        });
        this.profile = profile;
    }

    setSelected(selected) {
        this.toggleAttribute("selected", selected);
        const card = this.querySelector(".card");
        const outline = this.querySelector(".outline");
        if (outline) outline.style.stroke = selected ? "white" : "";
        if (outline) outline.style.strokeWidth = selected ? "6" : "";
        if (card) {
            if (selected) {
                const computed = getComputedStyle(this);
                card.style.fill = computed.getPropertyValue("--main-hover").trim();
            } else {
                card.style.fill = "";
            }
        }
    }
}

class ProfilesPage extends SvgPlus {
    constructor() {
        super("profiles-page");

        let header = this.createChild("div", { class: "header-container" });
        header.createChild("h1", { content: "Welcome!", class: "header" });
        header.createChild("div", { 
            content: "Follow this quick setup to customise each client's accessibility needs. You can choose an existing profile or create a new one.", 
            class: "title" 
        });
        header.createChild("h2", { content: "Existing Profiles", class: "existing-profiles-title" });

        this.gridWrapper = header.createChild("div", { class: "profiles-grid-wrapper" });
        this.grid = new GridLayout(1, 3);
        this.gridWrapper.appendChild(this.grid);

        header.createChild("h2", { content: "Create a profile", class: "create-profile" });
        this.input = header.createChild("input", { placeholder: "Enter a name", class: "name-input" });

        this.btn = header.createChild("access-button", { content: "Continue", class: "continue-btn" });
        this.btn.disabled = true;

        this.appendChild(header);
    }

    set profiles(profiles) {
        this.grid.innerHTML = "";
        this.gridWrapper.removeChild(this.grid);
        this.grid = new GridLayout(1, profiles.length || 3);
        this.grid.style.gridTemplateColumns = `repeat(${profiles.length || 3}, 33.333%)`;
        this.gridWrapper.appendChild(this.grid);
        this._profileCards = this.grid.addItemInstances(ProfileCard, profiles, 0, 0);
    }
}

class AccessMethodCard extends GridIcon {
    constructor(method) {
        super({
            displayValue: method.name,
            symbol: method.symbol,
            type: method.type,
            class: `access-method-card-icon ${method.className || ""}`,
            events: {
                "access-click": (e) => {
                    e.stopPropagation();
                    this.dispatchEvent(new CustomEvent('method-selected', {
                        bubbles: true,
                        detail: { method: method }
                    }));
                }
            }
        });
        this.method = method;
    }

    setSelected(selected) {
        this.toggleAttribute("selected", selected);
        const card = this.querySelector(".card");
        const outline = this.querySelector(".outline");
        if (outline) outline.style.stroke = selected ? "white" : "";
        if (outline) outline.style.strokeWidth = selected ? "6" : "";
        if (card) {
            if (selected) {
                const computed = getComputedStyle(this);
                card.style.fill = computed.getPropertyValue("--main-hover").trim();
            } else {
                card.style.fill = "";
            }
        }
    }
}

class AccessMethodPage extends SvgPlus {
    constructor(feature, profileName, onClose) {
        super("access-method-page");
        this.feature = feature;
        this.profileName = profileName;
        this.onClose = onClose;
        this._selectedMethod = null;
        this._isUpdatingFromRemote = false;
        this._methodCards = new Map();

        this.exitBtn = this.createChild("access-button", { content: "×", class: "exit-btn" });
        this.exitBtn.addEventListener("access-click", (e) => {
            e.stopPropagation();
            if (this.onClose) this.onClose();
        });

        this.headerContainer = this.createChild("div", { class: "header-container" });

        this.headerContainer.createChild("h1", {
            class: "access-method-title",
            content: "Choose Your Access Method"
        });

        this.methodsGrid = this.headerContainer.createChild(GridLayout, {
            class: "access-methods-grid"
        }, 1, 3);

        this.continueBtn = this.headerContainer.createChild("access-button", { class: "continue-btn", content: "Continue" });
        this.continueBtn.disabled = true;

        this.continueBtn.addEventListener("access-click", async () => {
            if (this.continueBtn.disabled) return;
            const startStepMap = { 'Eye Gaze': 'calibration-size', 'Switch': 'switch-setup', 'Cursor': 'cursor-setup-1' };
            const startStepId = startStepMap[this._selectedMethod];

            if (['Eye Gaze', 'Switch', 'Cursor'].includes(this._selectedMethod)) {
                this.feature.sdata.set("selectedProfile", { name: this.profileName, method: this._selectedMethod });
                this.feature.sdata.set("setupState", { screen: "startWalkthrough", profileName: this.profileName, selectedMethod: this._selectedMethod, startStepId });
            } else {
                alert(`Profile: ${this.profileName}\nSelected: ${this._selectedMethod}\n\nWalkthrough coming soon!`);
            }
        });
    }

    destroy() {
        if (this.exitBtn && this.exitBtn.parentNode) this.exitBtn.remove();
    }
    
    renderMethods(methods) {
        this.methodsGrid.innerHTML = "";
        this._methodCards.clear();

        methods.forEach((method, i) => {
            const card = new AccessMethodCard(method);
            this.methodsGrid.add(card, 0, i);
            this._methodCards.set(method.name, card);

            card.addEventListener('method-selected', () => {
                if (this._isUpdatingFromRemote) return;
                this._methodCards.forEach(c => c.setSelected(false));
                card.setSelected(true);
                this._selectedMethod = method.name;
                this.continueBtn.disabled = false;
                this.feature.sdata.update("setupState", { selectedMethod: method.name });
            });
        });
    }

    syncFromState(state) {
        this._isUpdatingFromRemote = true;
        if (state.selectedMethod) {
            this._methodCards.forEach(card => card.setSelected(false));
            const card = this._methodCards.get(state.selectedMethod);
            if (card) {
                card.setSelected(true);
                this._selectedMethod = state.selectedMethod;
                this.continueBtn.disabled = false;
            }
        }
        this._isUpdatingFromRemote = false;
    }
}

class SetUpWindow extends OccupiableWindow {

    constructor(feature) {
        super("setup-window"); 
        this.feature = feature;
        this._accessPage = null;
        this._selectedCard = null;
        this._profileName = null;
        this._newName = "";
        this._isUpdatingFromRemote = false;
        this._localSetInProgress = false;

        let profilePage = this.createChild(ProfilesPage);
        this.page = profilePage;
        const profileList = feature.session.settings.profiles ?? [];
        profilePage.profiles = profileList;

        this.exitBtn = this.createChild("access-button", { content: "x", class: "exit-btn" });
        this.exitBtn.addEventListener("access-click", (e) => {
            e.stopPropagation();
            this.forceClose(true);
        });
     
        this.appendChild(this.exitBtn);

        profilePage.addEventListener("profile-selected", (e) => {
            if (this._isUpdatingFromRemote) return;
            if (this._selectedCard) this._selectedCard.setSelected(false);
            this._selectedCard = e.detail.card; 
            this._selectedCard.setSelected(true);
            this._profileName = e.detail.profile.name;
            this._newName = "";
            profilePage.input.value = "";
            this._updateBtn();

            this._localSetInProgress = true;
            this.feature.sdata.set("setupState", {
                screen: "profileSelection",
                selectedProfile: e.detail.profile.name,
                newName: ""
            });
        });

        profilePage.addEventListener("add-profile", async (e) => {
            await this._createProfile(e.detail.name);
        });

        profilePage.input.addEventListener("input", (e) => {
            if (this._isUpdatingFromRemote) return;
            this._newName = e.target.value;
            if (this._selectedCard) this._selectedCard.setSelected(false);
            this._selectedCard = null;
            this._updateBtn();
            this._localSetInProgress = true;
            this.feature.sdata.set("setupState", {
                screen: "profileSelection",
                selectedProfile: null,
                newName: this._newName
            });
        });

        profilePage.btn.addEventListener("access-click", async () => {
            if (profilePage.btn.disabled) return;
            
            const profileName = this._selectedCard
                ? this._profileName
                : this._newName.trim();

            if (!this._selectedCard && profileName) {
                await this._createProfile(profileName);
            }

            this.feature.sdata.set("setupState", {
                screen: "accessMethodSelection",
                profileName: profileName
            });
        });
    }

    get _mask() { 
        return this.feature.walkThroughOverlay.mask; 
    }

    _setMaskColor() { this._mask?.classList.add('setup-mode'); }
    _clearMaskColor() { this._mask?.classList.remove('setup-mode'); }

    getArea(...args) { return this.feature.controller.getArea(...args); }

    

    _syncProfileSelectionFromState(state) {
        if (this._localSetInProgress) {
            this._localSetInProgress = false;
            return;
        }

        this._isUpdatingFromRemote = true;

        if (typeof state.newName === "string" && this.page.input.value !== state.newName) {
            this.page.input.value = state.newName;
            this._newName = state.newName;
        }

        if (state.selectedProfile) {
            this._newName = "";
            this.page.input.value = "";
            this._profileName = state.selectedProfile;

            const found = this.page._profileCards?.find(
                card => card && card.profile?.name === state.selectedProfile
            );

            if (this._selectedCard) this._selectedCard.setSelected(false);
            if (found) {
                found.setSelected(true);
                this._selectedCard = found;
            }
        } else {
            if (this._selectedCard) {
                this._selectedCard.setSelected(false);
                this._selectedCard = null;
            }
            this._profileName = null;
        }

        this._updateBtn();
        this._isUpdatingFromRemote = false;
    }

    showAccessMethodSelection(profileName) {
        if (this._accessPage && this._accessPage.profileName === profileName) return;

        this.page.innerHTML = "";

        const methods = [
            { name: "Eye Gaze", symbol: "eye", type: "lightGold"},
            { name: "Switch", symbol: "switch", type: "darkRed" },
            { name: "Cursor", symbol: "mouse", type: "lightBlue"}
        ];

        this._accessPage = new AccessMethodPage(this.feature, profileName, () => this.forceClose(true));
        this.page.appendChild(this._accessPage);
        this._accessPage.renderMethods(methods);
    }

    static get fixToolBarWhenOpen() { return true; }

    async close() { await this.forceClose(); }


    async open() {
        await this.show();

        let profiles = [];
        try {
            profiles = this.feature.session.settings.profiles.map(p => ({ name: p.name, profileID: p.profileID }));
            if (profiles.length > 0) this.feature.sdata.set("profiles", profiles);
        } catch (error) { console.warn("Could not load profiles:", error); }

        const mask = this._mask;
        mask.start();
        mask.clearAreas();
        const area = this.getArea(3, 4, 0, 0, 0, 0);
        if (area) mask.addArea(area);
        await mask.show();
        this._setMaskColor();

        this.page.profiles = profiles;

        await this.feature.sdata.set("setupState", { screen: "profileSelection", selectedProfile: null, newName: "" });

        this._unsubProfiles = this.feature.sdata.onValue("profiles", (remoteProfiles) => {
            if (!remoteProfiles) return;
            this._isUpdatingFromRemote = true;
            this.page.profiles = remoteProfiles;
            this._isUpdatingFromRemote = false;
        });

        this._unsubSetupState = this.feature.sdata.onValue("setupState", (state) => {
            if (!state) return;

            if (state.screen === "profileSelection") {
                this._syncProfileSelectionFromState(state);
            } else if (state.screen === "accessMethodSelection") {
                this.showAccessMethodSelection(state.profileName);
                if (this._accessPage) this._accessPage.syncFromState(state);
            } else if (state.screen === "startWalkthrough") {
                this.forceClose().then(async () => {
                    const walkthroughFeature = this.feature.session.getFeature("walkThrough");
                    if (walkthroughFeature) await walkthroughFeature.controller.start(state.startStepId || 'calibration-size');
                });
            }
        });
    }

    async forceClose(openDefault = false) {
        
        if (this._unsubProfiles) { this._unsubProfiles(); this._unsubProfiles = null; }
        if (this._unsubSetupState) { this._unsubSetupState(); this._unsubSetupState = null; }

        await this.hide(); 
        this._clearMaskColor();
        if (this._accessPage) { this._accessPage.destroy(); this._accessPage = null; }
        const mask = this._mask;
        mask.clearAreas();
        await mask.hide();
        mask.stop();

        await new Promise(resolve => setTimeout(resolve, 100));
        this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
        if (openDefault) this.feature.session.openWindow("default");
    }

    async _createProfile(name) {
        try {
            const newID = await this.feature.session.settings.createProfile(name);
            console.log("Created new profile:", name, "with ID:", newID);
            this.page.input.value = "";
            this._newName = "";
            this._updateBtn();
        } catch (err) {
            console.error("Failed to create profile:", err);
        }
    }

    destroy() {
        if (this.exitBtn && this.exitBtn.parentNode) {
            this.exitBtn.remove();
        }
    }

    _updateBtn() {
        const enabled = !!(this._selectedCard || this._newName?.trim());
        this.page.btn.disabled = !enabled;
    }

    renderProfiles(profileList) {
        this.page.profiles = profileList;
    }

    static get usedStyleSheets() {
        return [relURL("./Setup/setup.css", import.meta), 
            GridIcon.styleSheet
        ];
    }
}

export { SetUpWindow };