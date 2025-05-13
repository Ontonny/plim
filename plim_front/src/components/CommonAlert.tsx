import { Alert, Button, Intent } from "@blueprintjs/core";
import { useState } from "react";
import { IconNames } from "@blueprintjs/icons";

const CommonAlert = (props: { message: string, showAlert: boolean, setShowAlert: (showAlert: boolean) => void }) => {
    // const [isOpen, setIsOpen] = useState(false);
    const [canEscapeKeyCancel, setCanEscapeKeyCancel] = useState(false);
    const [canOutsideClickCancel, setCanOutsideClickCancel] = useState(false);

    const handleConfirm = () => {
       props.setShowAlert(false)
    }
    
    return (
        <Alert
            canEscapeKeyCancel={canEscapeKeyCancel}
            canOutsideClickCancel={canOutsideClickCancel}
            confirmButtonText="Close"
            icon={IconNames.ERROR}
            intent={Intent.DANGER}
            isOpen={props.showAlert}
            onConfirm={handleConfirm}
        >
            <p>
                {props.message}
            </p>
        </Alert>
    )
}

export default CommonAlert;