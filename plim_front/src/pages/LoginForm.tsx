import { useEffect, useState } from "react";
import { Button, Card, Elevation, FormGroup, InputGroup } from "@blueprintjs/core";
import { useAuthenticationStore } from '../store';
import CommonAlert from "../components/CommonAlert";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser, checkLogin, error } = useAuthenticationStore();
  const [showAlert, setShowAlert] = useState(false);
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginUser(username, password)
  };
useEffect(() => {
  checkLogin()
}, []);
useEffect(() => {
  if (error) {
    setShowAlert(true)
  }
}, [error])

  return (
    <div style={styles.container}>
      <Card elevation={Elevation.TWO} style={styles.card}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <FormGroup label="Username" labelFor="username-input" labelInfo="(required)">
            <InputGroup
              id="username-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormGroup>

          <FormGroup label="Password" labelFor="password-input" labelInfo="(required)">
            <InputGroup
              id="password-input"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              rightElement={
                <Button
                  icon={showPassword ? "eye-off" : "eye-open"}
                  minimal={true}
                  onClick={() => setShowPassword(!showPassword)}
                />
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormGroup>

          <Button intent="primary" type="submit" style={styles.loginButton}>
            Login
          </Button>
        </form>
      </Card>
      {showAlert && <CommonAlert message={error} showAlert={showAlert} setShowAlert={setShowAlert}/>}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  card: {
    width: "300px",
    padding: "20px",
  },
  loginButton: {
    width: "100%",
    marginTop: "10px",
  },
};

export default LoginForm;