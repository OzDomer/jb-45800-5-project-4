import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
    tableName: 'jobs',
    underscored: true
})
export default class Job extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string

    @AllowNull(false)
    @Column(DataType.STRING)
    imageKey: string

    @AllowNull(false)
    @Default('pending')
    @Column(DataType.ENUM('pending', 'done', 'failed'))
    status: string

    @AllowNull(true)
    @Column(DataType.STRING)
    label: string

    @AllowNull(true)
    @Column(DataType.FLOAT)
    confidence: number

    @AllowNull(true)
    @Column(DataType.JSON)
    probabilities: object

    @AllowNull(true)
    @Column(DataType.TEXT)
    error: string

}
