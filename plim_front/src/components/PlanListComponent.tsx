import { useEffect } from "react";
import { useMenuStore, usePlansStore } from "../store";
import { Button, Card, CardList, EntityTitle, Intent, Section, SectionCard, Tag } from "@blueprintjs/core";
import classNames from "classnames";




const PlanListComponent: React.FC<any> = () => {
    const { planList, getPlanList, setActivePlan, activePipelineName } = usePlansStore();
    const sectionCardClasses = classNames("docs-section-card", {
        "docs-section-card-limited-height": true,
    });
    const { searchingPlanName } = useMenuStore();
    const filterPlans = (p: any) => {
        if (p == "") { return true }
        if (p.planName == undefined) { return true }
        return p.planName.includes(searchingPlanName)
    }
    useEffect(() => {
        getPlanList()
    }, []);
    // PlanRowComponent WrapperDiv={CardList}
    // TODO добавить описания
    const getPlanIcon = (type: string) => {
        switch (type) {
            case "gitlab-ansible-base64":
                return "console"
            case "gitlab-base64":
                return "array-numeric"
            case "gitlab-native":
                return "flows"
            default:
                return "bug";
        }
    }

    return (
        <>
            <SectionCard padded={true} className={sectionCardClasses}>
                <CardList>
                    {
                        planList.filter(p => filterPlans(p)).map((p, i) => <Card key={i} selected={activePipelineName == p.planName} onClick={(e) => setActivePlan(e.target.textContent)
                        } interactive={false}>{
                                <EntityTitle icon={getPlanIcon(p.type)} title={p.planName} tags={
                                    <>
                                        <Tag intent={Intent.SUCCESS} minimal={true}>
                                            {p.type}
                                        </Tag>
                                        <Tag intent={Intent.WARNING} minimal={true}>
                                            pid:{p.gitlab.projectId}
                                        </Tag>
                                        <Tag intent={Intent.PRIMARY} minimal={true}>
                                            ref:{p.gitlab.ref}
                                        </Tag>
                                    </>
                                }></EntityTitle>
                            }
                        </Card>)
                    }
                </CardList>
            </SectionCard>
        </>
    );
}

export default PlanListComponent;