import React, {useCallback, useLayoutEffect, useMemo, useRef} from 'react';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import useCurrentTheme from './useCurrentTheme';
import useDefaultThemes from './useDefaultThemes';
import useUserThemes from './useUserThemes';

export default function AppearanceSettingsGeneral() {
    const currentTheme = useCurrentTheme();
    const defaultThemesRef = useRef<HTMLSelectElement>(null);
    const userThemesRef = useRef<HTMLSelectElement>(null);
    const userThemeRef = useRef<HTMLInputElement>(null);
    const initialFontSize = useMemo(() => theme.fontSize, []);
    const defaultThemes = useDefaultThemes();
    const userThemes = useUserThemes();
    const userTheme = !!currentTheme.userTheme;

    useLayoutEffect(() => {
        // Lock `font-size` for this dialog.
        const systemStyle = document.getElementById('system')!.style;
        systemStyle.setProperty('--font-size', String(theme.fontSize));
        return () => {
            theme.restore();
            systemStyle.removeProperty('--font-size');
        };
    }, []);

    const handleSubmit = useCallback(() => theme.save(), []);

    const handleThemeChange = useCallback(() => {
        const newTheme = userThemeRef.current!.checked
            ? themeStore.getUserTheme(userThemesRef.current!.value)
            : themeStore.getDefaultTheme(defaultThemesRef.current!.value);
        if (newTheme) {
            theme.apply(newTheme);
        }
    }, []);

    const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        theme.fontSize = event.target.valueAsNumber;
    }, []);

    return (
        <form className="theme-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Theme</legend>
                <div className="table-layout">
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id="default-themes"
                            value=""
                            checked={!userTheme}
                            onChange={handleThemeChange}
                        />
                        <label htmlFor="default-themes">Default themes:</label>
                        <select
                            value={userTheme ? undefined : currentTheme.name}
                            disabled={userTheme}
                            onChange={handleThemeChange}
                            ref={defaultThemesRef}
                        >
                            {defaultThemes.map(({name}) => (
                                <option value={name} key={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </p>
                    <p>
                        <input
                            type="radio"
                            name="theme-source"
                            id="user-themes"
                            value="user"
                            checked={userTheme}
                            disabled={userThemes.length === 0}
                            onChange={handleThemeChange}
                            ref={userThemeRef}
                        />
                        <label htmlFor="user-themes">My themes:</label>
                        <select
                            value={userTheme ? currentTheme.name : undefined}
                            onChange={handleThemeChange}
                            disabled={!userTheme}
                            ref={userThemesRef}
                        >
                            {userThemes.map(({name}) => (
                                <option value={name} key={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </p>
                </div>
            </fieldset>

            <fieldset>
                <legend>Preferences</legend>
                <div className="table-layout">
                    <p className="font-size">
                        <label htmlFor="theme-fontSize">Font Size:</label>
                        <input
                            type="range"
                            id="theme-fontSize"
                            min={12}
                            max={28}
                            step={0.4}
                            defaultValue={initialFontSize}
                            onChange={handleFontSizeChange}
                        />
                    </p>
                </div>
            </fieldset>

            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
