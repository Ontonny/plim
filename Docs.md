# YAML Configuration Documentation

## Core Parameters
- `listen_address: "0.0.0.0:3000"` (string) - Service binding address in IP:PORT format
- `jwt_token_duration_hours: 24` (integer) - JWT token validity period in hours
- `webhook_token_length: 12` (integer) - Minimum length is allowed for webhook tokens (for security reasons)

#### User Configuration
```yaml
admins: 
  - "admin"  # List of administrator usernames
users:
  "username":  # Unique username as key
    full_name: "User Name"  # Display name
    email: "user@domain.com"  # Contact email
    groups:  # Access groups
      - "developers"
      - "testers"
    hashed_password: "$2a$12$..."  # BCrypt hash
    disabled: false  # Account status flag
```

#### Gitlab Configuration
```yaml
gitlab:
  api_endpoint: "http://gitlab/api/v4" # Gitlab API endpoint
```

#### Plans Configuration
```yaml
plans:  # Plans configuration
  test:  # Plan name as key
    name: "Some example from main config file"  # Plan display name
    type: gitlab-native  # Plan type
    groups: [other]  # Plan access groups
    ansible:  # Ansible configuration
      backend_inventory:  # Ansible inventory configuration
        type: gitlab  # Ansible inventory type (gitlab, local)
        project_id: 1  # Gitlab project ID
        file_path: "ansible/prod/test.ini"  # Ansible inventory file path
        ref_name: "main"  # Gitlab branch name
        token_var: "ADMIN_GL_TOKEN"  # Gitlab token variable name
      vault_pass_file: ""  # Ansible vault password file path
      tags: []  # Ansible tags
      limit: []  # Ansible limit
      ask_vault_password: false  # Ansible ask vault password
      check: false  # Ansible check
      diff: true  # Ansible diff
      private_key: ~/.ssh/id_rsa  # Ansible private key path
      playbook: my_playbook.yml  # Ansible playbook file path
      inventory: ansible/prod/small.yml  # Ansible inventory file path
      syntax_check: false  # Ansible syntax check
      forks: 5  # Ansible forks
      verbosity: 0  # Ansible verbosity
    gitlab:  # Gitlab configuration
      project_id: 1  # Gitlab project ID
      token_var: ADMIN_GL_TOKEN  # Gitlab token variable name
      ref: main  # Gitlab branch name
      execute_api_type: create  # Gitlab execute API type
      json_data_key: ansible_base64  # Gitlab JSON data key
      ref_select:  # Gitlab ref select configuration
        ref_select_enabled: true  # Gitlab ref select enabled
        branch_enabled: false  # Gitlab branch enabled
        branch_search_name: test  # Gitlab branch search name
        branch_regex: ~  # Gitlab branch regex
        tag_enabled: true  # Gitlab tag enabled
        tag_search_name: ~  # Gitlab tag search name
        tag_regex: ^tag  # Gitlab tag regex
    webhooks:  # Webhooks configuration
      - name: "test"  # Webhook name
        trigger_token: "TEST_TOKEN"  # Webhook trigger token
        type: static  # Webhook type
        ansible:  # Ansible configuration
          playbook: my_playbook.yml  # Ansible playbook file path
          inventory: ansible/prod/small.yml  # Ansible inventory file path
          backend_inventory:  # Ansible backend inventory configuration
            type: local  # Ansible backend inventory type
            file_path: "config/ansible/small.ini"  # Ansible backend inventory file path
          limit: ["all"]  # Ansible limit
        views:  # Webhook views configuration
          - text: "boolean test"  # View text
            type: checkbox  # View type
            key: "WEBHOOK_TEST"  # View key
            value: false  # View value
      - name: "test-dynamic"
        trigger_token: "TEST_TOKEN"
        type: dynamic # dynamic webhook
        ansible:
          playbook: test_playbook.yml
          inventory: ansible/prod/small.yml
          backend_inventory:
            type: local
            file_path: "config/ansible/small.ini"
          limit: ["all"]
          tags: []
          vault_pass_file: ""
          ask_vault_password: false
        views:
          - text: "boolean test"
            type: checkbox
            key: "WEBHOOK_TEST1"
            value: false
          - text: "boolean test"
            type: checkbox
            key: "WEBHOOK_TEST2"
            value: false
          - text: "boolean test"
            type: checkbox
            key: "WEBHOOK_TEST3"
            value: false
    views:  # Plan views configuration list
      - text: "boolean test"  # View text
        type: checkbox  # View type
        key: "TEST_CHECKBOX"  # View key
        value: true  # View value
```


#### Plans views

```yaml
## Views section 
Views: # list of views

# checkbox
- text: "boolean test"  # View text
  type: checkbox  # View type
  key: "TEST_CHECKBOX"  # View key
  value: true  # View value

# checkbox-list
- text: "boolean test list"
  type: checkbox-list
  keys: ["TEST_C_LIST1", "TEST_C_LIST2", "TEST_C_LIST3", "TEST_C_LIST4", "TEST_C_LIST5"]
  values: [true, false, true, false, false]

# select
- text: "select_test"
  type: select
  data: ["Nice", "Bad", "Human", "Animal"]
  key: "SELLLECT"
  value: ["Nice", "Bad"]

# input-field
- text: "input_test"
  type: input-field
  key: "TEST_INPUTF"
  value: "123"

# password-input-field
- text: "password_test"
  type: password-input-field
  key: "PASDS_TST"
  value: "456"

# hidden
- text: "hidden_test"
  type: hidden
  key: "HIDD_KEY"
  value: "678"

# date-picker
- text: "date-picker_test"
  type: date-picker
  format: "M/D/YYYY"
  value: "2024-09-26"
  key: "DATE_KEY"

# radio
- text: "radio_test"
  type: radio
  key: "TEST_RADIO"
  value: "1"
  data: ["1", "2", "3", "4"]

# checkbox-dynamic
- text: "checkbox_dynamic_test"
  type: checkbox-dynamic
  key: "TEST_CHECKBOX_DYNAMIC"
  value: "1"
  data: []
  referenced_key: []

# radio-dynamic
- text: "radio_test"
  type: radio-dynamic
  key: "TEST_RADIO"
  value: "Example[radio_test]"
  data: ["Male[TEST_CHECKBOX:true,SELLLECT:Nice]", "Female[radio_test,SELLLECT:Bad]", "Example[TEST_CHECKBOX:false]", "Tttest[radio_test]"]
  referenced_key: [TEST_CHECKBOX,SELLLECT]
```








## Dynamics views works with this functions
```js
const containsAtLeastOne = (filterString: string, array: string[], suffixValues: any) => {
    return array?.some(substring => filterString.includes(substring+":"+suffixValues[substring]));
}
```