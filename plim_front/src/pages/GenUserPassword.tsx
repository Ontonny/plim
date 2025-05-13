import { useGenPassStore } from "../store";
import { Button, FormGroup, InputGroup, OverlayToaster, Position, Toaster } from "@blueprintjs/core";
import { useRef, useState } from "react";
import { PlanToaster } from "../components/PlanToaster"

const GenUserPassword = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { getUserPasswordHash, passwordHash } = useGenPassStore();

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const showCopySuccess = async () => {
        (await PlanToaster).show({ message: "Hash copied to clipboard", intent: "success" });
    };

    const handleSubmit = () => {
        getUserPasswordHash(password)
        console.log('Password:', password);
    };
    const copyHash = () => {
        if (passwordHash) {
            navigator.clipboard.writeText(passwordHash)
                .then(() => {
                    showCopySuccess()
                })
                .catch(() => {
                    console.log("Copy error");

                });
        }
    };
    return (
        <div style={{ padding: '50px' }}>
            <FormGroup
                label="Password"
                labelFor="password-input"
                labelInfo="(required)"
            >
                <InputGroup
                    id="password-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    type={showPassword ? "text" : "password"}
                    rightElement={
                        <Button
                            icon={showPassword ? "eye-off" : "eye-open"}
                            minimal={true}
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    }
                />
            </FormGroup>
            <FormGroup style={{ width: '600px' }}
                label="HASH"
            >
                <InputGroup
                    id="username-input"
                    type="text"
                    placeholder="password hash will be here"
                    value={passwordHash}
                    onClick={copyHash}
                />
            </FormGroup>
            <Button onClick={handleSubmit} intent="primary">
                Submit
            </Button>
        </div>
    );
};
export default GenUserPassword;