import { useEffect, useState } from "react";
import { useAnsibleStore } from "../store";
import { MenuItem } from "@blueprintjs/core";
import { ItemRenderer, MultiSelect } from "@blueprintjs/select";

const AnsibleGroupSelect: React.FC = () => {
    const { selectedGroups, cleanAllSelected, ansibleData: groupsData, selectGroup, getAllUniqGroups } = useAnsibleStore();
    interface TagItem {
        id: number;
        label: string;
    }
    const renderTagItem: ItemRenderer<TagItem> = (tag, { modifiers, handleClick }) => {
        if (!modifiers.matchesPredicate) {
            return null;
        }
        if (selectedGroups.includes(tag.label)) {
            return null;
        }

        return (
            <MenuItem
                key={tag.id}
                text={tag.label}
                active={modifiers.active}
                onClick={handleClick}
                roleStructure="menuitem"
            />
        );
    };
    const [tagList, setTagList] = useState<TagItem[]>([]);
    const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
    const renderTag: (tag: TagItem) => string = (tag) => tag.label;
    const handleTagSelect = (tag: TagItem) => {
        setSelectedTags(prevSelectedTags => {
            const isSelected = prevSelectedTags.find(t => t.id === tag.id);
            selectGroup(tag.label)
            return isSelected
                ? prevSelectedTags.filter(t => t.id !== tag.id)
                : [...prevSelectedTags, tag];
        });
    };

    useEffect(() => {
        const AllUniqGroups: TagItem[] = selectedGroups.map((name, index) => ({
            id: index + 1000,
            label: name
        }));
        setSelectedTags(AllUniqGroups)

    }, [selectedGroups]);

    useEffect(() => {
        const AllUniqHosts: TagItem[] = getAllUniqGroups().map((name, index) => ({
            id: index + 1,
            label: name
        }));
        setTagList(AllUniqHosts)
    }, [groupsData]);

    const handleTagRemove = (tag: TagItem, index: number) => {
        setSelectedTags(prevSelectedTags => prevSelectedTags.filter((_, i) => i !== index));
        selectGroup(tag);

    };

    return (
        <MultiSelect
            items={tagList}
            fill={true}
            itemRenderer={renderTagItem}
            tagRenderer={renderTag}
            onClear={() => { cleanAllSelected() }}
            menuProps={{ "aria-label": "films" }}
            popoverProps={{ minimal: true, matchTargetWidth: true }}
            onItemSelect={handleTagSelect}
            selectedItems={selectedTags}
            tagInputProps={{ onRemove: handleTagRemove }}
            placeholder={"Select ansible groups to run"}
        >
        </MultiSelect>
    );
};

export default AnsibleGroupSelect;