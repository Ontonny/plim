import React, { useEffect, useState } from 'react';
import { Button, Card, CardList, CompoundTag, EntityTitle, H1, H3, H5, Icon, IconSize, InputGroup, Tag, TagProps } from "@blueprintjs/core";
import { usePlansStore } from '../store';



const ExtendedTag: React.FC<any> = ({ ...props }) => {
  return (
    <div >
        <CompoundTag intent='warning' fill={true} style={{ display: "block", marginBottom: "1px", textAlign: "right"}} {...props}>
          {props.children}
        </CompoundTag>
    </div >
  );
};


const Users: React.FC = () => {
  const { userList, getUserList } = usePlansStore();
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    getUserList()
  }, []);
  return (
    <div style={{ marginLeft: '50px', padding: '1px',  width: "40%" }}>
      <h2></h2>
      <EntityTitle icon={"user"} title={"User Management"} heading={ H5 } subtitle={"Here u can view user account status"}></EntityTitle>
      <br/>
      <CardList>
        {
          userList.map((user, i) =>
            <Card key={i} style={{ display: 'flex', gap: "1px", flexDirection: "column", alignItems:"flex-start" }}>
              <>
                <ExtendedTag intent='success' leftContent={"Username:"}> {user.username}</ExtendedTag>
                <ExtendedTag leftContent={"User fullname:"}>{user.fullname}</ExtendedTag>
                <ExtendedTag leftContent={"User groups:"} intent='danger'>{user.groups.join(', ')}</ExtendedTag>
                <InputGroup
                    id="username-input"
                    fill={true}
                    value={user.hashed_password}
                    placeholder="password hash will be here"
                    type={showPassword ? "text" : "password"}
                    rightElement={
                      <Button
                        icon={showPassword ? "eye-off" : "eye-open"}
                        minimal={true}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    }
                />
                <ExtendedTag leftContent={"Status"} intent='primary'> {user.disabled ? <Icon intent='danger' icon="cross" /> : <Icon icon="endorsed" intent='success' />}</ExtendedTag>
              </>
            </Card>)
        }
      </CardList>
    </div>
  );
};

export default Users;